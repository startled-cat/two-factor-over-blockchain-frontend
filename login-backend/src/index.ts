import express from "express"
import { resolve } from "path";
import Web3 from 'web3';
import { Account } from "web3-core";
import { Contract } from 'web3-eth-contract';

import { NetworkConfig, accounts, loadContractConfig, networks } from "./Config";
import { DEFAULT_GAS_LIMIT, getContract, getWeb3, loadAccounts, makeContractCall } from './Web3Client';

import { authenticateUser, getUserAddress } from './Users';


const port = 3001;
const server: express.Application = express()

const FAKE_LOGIN: boolean = true;
const FAKE_LOGIN_DELAY: number = 10;

//allow request body as json
server.use(express.json());

// allow cors for all requests
server.use(function (_req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// log every request 
server.use(function (req, _res, next) {
    console.log(`[${req.method}] [${req.url}]`);
    // if request is of methdo post, log body
    if (req.method == "POST") {
        console.log(req.body);
    }

    next();
});

// after every request, log response
server.use(function (req, res, next) {
    res.on("finish", function () {
        console.log(`[${res.statusCode}] [${req.url}]`);
    }).on("close", function () {
        console.log(`[${res.statusCode}] [${req.url}]`);
    }).on("error", function (err) {
        console.log(`[${res.statusCode}] [${req.url}]`);
        console.log(err);
    }).on("end", function () {
        console.log(`[${res.statusCode}] [${req.url}]`);
    });
    next();
});




function sleep(arg0: number) {
    return new Promise(resolve => setTimeout(resolve, arg0));
}

const setup = async (network_config: NetworkConfig) => {
    let web3: Web3 = getWeb3(network_config);
    let contract: Contract = await getContract(web3, network_config);
    loadAccounts(web3);

    let account_index = 0;
    // if network gateway is localhost then use local account at index 1
    if (network_config.gateway_url.includes("localhost")) {
        account_index = 1;
    }

    return {
        web3: web3,
        contract: contract,
        account: web3.eth.accounts.wallet[account_index]
    }
}
enum LoginRequestStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",

    COMPLETED = "COMPLETED",
    FAILED = "FAILED",

    CONSUMED = "CONSUMED",
}

interface LoginRequest {
    id: string,
    chain_id: string,
    user_address: string,
    status: LoginRequestStatus,
    error: string,
    created_at: Date,
    updated_at: Date,

}
var login_requests: LoginRequest[] = []

server.get('/', (_req, res) => {
    res.send({ networks: networks, accounts: accounts.map(acc => acc.address) });
})
server.get('/reload', async (_req, res) => {
    await loadContractConfig(true);
    res.send({ networks: networks });
})
server.get('/chain/:chainId', async (req, res) => {
    let chain_id: string = req.params.chainId;
    if (!(chain_id in networks)) {
        res.status(400).send({ "error": "Unknown chainId" });
        return;
    }
    let network_config = networks[chain_id];
    let { web3, contract, account } = await setup(network_config);
    res.send({ account: account.address, contract });
})

server.get('/chain/:chainId/check/:user', async (req, res) => {
    let chain_id: string = req.params.chainId;
    let user: string = req.params.user;

    if (!(chain_id in networks)) {
        res.status(400).send({ "error": "Unknown chainId" });
        return;
    }
    let network_config = networks[chain_id];
    let { web3, contract, account } = await setup(network_config);

    await contract.methods.checkAccess(user, account.address).call({
        gas: DEFAULT_GAS_LIMIT
    }).then((result: any) => {
        console.log({ checkAccess: result });
        res.send({ user: user, website: account.address, checkAccess: result })
    }).catch((error: any) => {
        res.status(400).send({ error })
    })
})

// server.get('/chain/:chainId/checkAccess/:user/:website', async (req, res) => {
//     let user: string = req.params.user;
//     let website: string = req.params.website;
//     await contract.methods.checkAccess(user, website).call({
//         gas: DEFAULT_GAS_LIMIT
//     }).then((result: any) => {
//         console.log({ checkAccess: result });
//         res.send({ user: user, website: website, checkAccess: result })
//     }).catch((error: any) => {
//         res.status(400).send({ error })
//     })
// })

server.get('/chain/:chainId/receive/:user', async (req, res) => {
    let chain_id: string = req.params.chainId;
    let user: string = req.params.user;

    if (!(chain_id in networks)) {
        res.status(400).send({ "error": "Unknown chainId" });
        return;
    } let network_config = networks[chain_id];

    let { web3, contract, account } = await setup(network_config);

    const methodCall = contract.methods.receiveAccess(user);

    await methodCall.estimateGas({
        from: account.address,
        gas: DEFAULT_GAS_LIMIT,
        value: '0'
    }).then((gasAmount: any) => {
        console.log({ gasAmount });
        // gas = gasAmount;
    }).catch((error: any) => {
        console.error(error);
    });

    new Promise<{ status: number, data: any }>((resolve, reject) => {
        contract.methods.receiveAccess(user).send({
            from: account.address,
            gas: DEFAULT_GAS_LIMIT,
            value: '0'
        }).on("transactionHash ", (transactionHash: String) => {
            console.log({ transactionHash })
        }).on("receipt", (receipt: Object) => {
            console.log({ receipt })
        }).on("confirmation", (confirmation: Number, receipt: Object, _latestBlockHash: String) => {

            if (confirmation <= 1) {
                console.log({ confirmation });
            }
            if (confirmation == 1) {
                resolve({ status: 200, data: receipt });
            }
        }).on("error", (error: Error) => {
            console.error(error);
            reject({ status: 500, data: error })
        })
    }).then(value => {
        res.status(value.status).send(value.data);
    }).catch(err => {
        res.status(err.status).send(err.data);
    })
})





interface LoginRequestBody {
    "chain_id": string,
    "user": {
        "login": string,
        "password": string,
    }
}
// create login request
server.post('/login', async (req, res) => {
    let body: LoginRequestBody;
    try {
        // parse request body as json
        body = req.body;
    } catch (error) {
        res.status(400).send({ error });
        return;
    }

    if (!(body.chain_id in networks)) {
        res.status(400).send({ "error": "Unknown chainId" });
        return;
    }

    // "authenticate" user
    let result = await authenticateUser(body.user.login, body.user.password);
    if (!result) {
        res.status(403).send({ "error": "Invalid credentials" });
        return;
    }


    // get user from database
    let user_address = await getUserAddress(body.user.login);
    // get most recent login request for this user
    let last_login_request = login_requests.filter(r => r.user_address == user_address).sort((a, b) => b.created_at.getTime() - a.created_at.getTime())[0];
    if (last_login_request) {
        if (last_login_request.status != LoginRequestStatus.CONSUMED) {
            res.status(406).send({ "error": "Cannot create another login request, while previous is not consumed" });
            return;
        }
    }

    // generate new login request id
    let login_request_id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    // create new login request
    let login_request: LoginRequest = {
        id: login_request_id,
        chain_id: body.chain_id,
        user_address: user_address,
        status: LoginRequestStatus.PENDING,
        error: "",
        created_at: new Date(),
        updated_at: new Date()
    }
    // append login request to array
    login_requests.push(login_request);
    // send login request id to user
    res.send({ login_request_id });

    // proces login request in a separete thread
    setTimeout(async () => {
        processLoginRequest(login_request_id);
    }, 0);
});

// view login request
server.get('/login/:loginRequestId', async (req, res) => {
    let login_request_id = req.params.loginRequestId;
    let login_request = login_requests.find(lr => lr.id == login_request_id);
    if (!login_request) {
        res.status(404).send({ "error": "Unknown login request id" });
        return;
    }
    res.send(login_request);
})

// view all login requests
server.get('/login', async (_req, res) => {
    // group login requests by their status
    let grouped_login_requests = login_requests.reduce((acc, curr) => {
        if (!acc[curr.status]) {
            acc[curr.status] = [];
        }
        acc[curr.status].push(curr);
        return acc;
    }, {} as { [key: string]: LoginRequest[] });
    res.send(grouped_login_requests);

})

// comsume login request
server.delete('/login/:loginRequestId', async (req, res) => {
    let login_request_id = req.params.loginRequestId;
    let login_request = login_requests.find(lr => lr.id == login_request_id);
    if (!login_request) {
        res.status(404).send({ "error": "Unknown login request id" });
        return;
    }

    switch (login_request.status) {
        case LoginRequestStatus.PENDING:
            res.status(400).send({ "error": "Login request is still pending" });
            return;
        case LoginRequestStatus.PROCESSING:
            res.status(400).send({ "error": "Login request is still processing" });
            return;
        case LoginRequestStatus.FAILED:
            res.status(400).send({ "error": "Login request failed: " + login_request.error });
            return;
        case LoginRequestStatus.COMPLETED:
            res.status(200).send({ "status": "Login request completed" });
            login_request.status = LoginRequestStatus.CONSUMED;
            return;
        case LoginRequestStatus.CONSUMED:
            res.status(400).send({ "error": "Login request is already consumed" });
            return;
        default:
            res.status(500).send({ "error": "Unknown login request status" });
            return;
    }
})



async function processLoginRequest(login_request_id: String) {
    console.log("Processing login request " + login_request_id);
    // get login request form array
    let possible_login_request = login_requests.find(request => request.id == login_request_id);

    // check if login request in undefined
    if (possible_login_request == undefined) {
        throw new Error("Login request not found");
    }
    let login_request: LoginRequest = possible_login_request;

    // check if login request is pending
    if (login_request.status != LoginRequestStatus.PENDING) {
        return;
    }

    // start prcessing login request
    login_request.status = LoginRequestStatus.PROCESSING;
    login_request.updated_at = new Date();


    if (FAKE_LOGIN) {
        // sleep for some time

        await sleep(FAKE_LOGIN_DELAY * 1000);
        // set login request as completed
        login_request.status = LoginRequestStatus.COMPLETED;
        login_request.error = "";
        login_request.updated_at = new Date();
        return;
    }

    let max_time = 600; // 10 minutes
    let sleep_time = 2; // 2 seconds
    let time_elapsed = 0;
    let is_access_granted = false;
    while (time_elapsed < max_time) {
        // check if user has access to website
        is_access_granted = await checkAccess(login_request.user_address, login_request.chain_id)
        if (is_access_granted) {
            break;
        }
        // wait for 2 seconds
        await sleep(sleep_time * 1000);
        time_elapsed += sleep_time;
    }

    // if access is not granted, complete login request with an error message
    if (!is_access_granted) {
        login_request.status = LoginRequestStatus.FAILED;
        login_request.error = "Access not granted";
        login_request.updated_at = new Date();
        return;
    }


    time_elapsed = 0;
    let is_access_received = false;
    while (time_elapsed < max_time) {
        let is_access_received = await receiveAccessFromUser(login_request.user_address, login_request.chain_id);
        if (is_access_received) {
            break;
        }
        await sleep(sleep_time * 1000);
        time_elapsed += sleep_time;
    }

    // if access is not received, complete login request with an error message
    if (!is_access_received) {
        login_request.status = LoginRequestStatus.FAILED;
        login_request.error = "Access not received";
        login_request.updated_at = new Date();
        return;
    }

    // complete login request
    login_request.status = LoginRequestStatus.COMPLETED;
    login_request.error = "";
    login_request.updated_at = new Date();

}

async function checkAccess(user_address: string, chain_id: string): Promise<boolean> {
    let network_config = networks[chain_id];
    let { web3, contract, account } = await setup(network_config);
    return await contract.methods.checkAccess(user_address, account.address).call({
        gas: DEFAULT_GAS_LIMIT
    }).then((result: any) => {
        console.log({ checkAccess: result });
        return result;
    }).catch((error: any) => {
        console.error(error);
        return false;
    })
}

async function receiveAccessFromUser(user_address: string, chain_id: string): Promise<boolean> {
    let network_config = networks[chain_id];
    let { web3, contract, account } = await setup(network_config);
    return await contract.methods.receiveAccess(user_address).send({
        from: account.address,
        gas: DEFAULT_GAS_LIMIT,
        value: '0'
    }).then((result: any) => {
        console.log({ receiveAccess: result });
        return true;
    }).catch((error: any) => {
        console.error(error);
        return false;
    })
}



server.listen(port, async () => {
    await loadContractConfig();
    console.log(`App is listening on port ${port}`);
});

