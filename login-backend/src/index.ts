import express from "express"
import { resolve } from "path";
import Web3 from 'web3';
import { Account } from "web3-core";
import { Contract } from 'web3-eth-contract';

import { NetworkConfig, accounts, loadContractConfig, networks } from "./Config";
import { DEFAULT_GAS_LIMIT, getContract, getWeb3, loadAccounts, makeContractCall } from './Web3Client';

const port = 3001;
const server: express.Application = express()


server.get('/', (_req, res) => {
    res.send({ networks: networks });
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


const setup = async (network_config: NetworkConfig) => {
    let web3: Web3 = getWeb3(network_config);
    let contract: Contract = await getContract(web3, network_config);
    loadAccounts(web3);
    return {
        web3: web3,
        contract: contract,
        account: web3.eth.accounts.wallet[0]
    }
}
server.listen(port, async () => {
    await loadContractConfig();
    console.log(`App is listening on port ${port}`);
});
