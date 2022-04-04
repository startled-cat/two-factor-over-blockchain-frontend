import express from "express"
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';

import { NetworkConfig, accounts } from "./Config";
import { DEFAULT_GAS_LIMIT, getCoinPrice, getContract, getNetworkConfig, getWeb3, makeContractCall } from './Web3Client';

const port = 3001;
const server: express.Application = express()


var web3: Web3;
var network_config: NetworkConfig;
var contract: Contract;

server.get('', (_req, res) => {
    res.send('Hello World')
})
server.get('/getCoinPrice', async (_req, res) => {
    let result: any = await getCoinPrice(network_config);
    res.send({ price: result })
})

server.get('/contract', async (_req, res) => {
    res.send(contract)
})



server.get('/wallet/add/:pk', async (req, res) => {
    let account: any = web3.eth.accounts.wallet.add(req.params.pk);
    res.send(account);
})

server.get('/sign/:from', async (req, res) => {
    web3.eth.sign("Hello world", req.params.from)
        .then((value) => {
            res.send(value);
        })
        .catch(error => {
            console.error(error);
            res.status(400).send(error);

        })
})

server.get('/contract/:method_name/:from', async (req, res) => {
    let method_name: string = req.params.method_name;
    let from: string = req.params.from;

    await contract.methods[method_name]().call({
        from: from,
        gas: DEFAULT_GAS_LIMIT
    }).then((result: any) => {
        console.log({ method_name, result });
        res.send({ method_name, result })
    }).catch((error: any) => {
        res.status(400).send({ error })
    })

})


server.listen(port, async () => {
    network_config = getNetworkConfig();
    console.log({ network_config });
    web3 = getWeb3(network_config);
    contract = await getContract(web3, network_config);
    console.log(`App is listening on port ${port}`);
});
