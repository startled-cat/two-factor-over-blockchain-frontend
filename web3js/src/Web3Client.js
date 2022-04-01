import fetch from 'node-fetch';
import Web3 from 'web3';
import { network_config } from './Config.js';
var web3 = new Web3(network_config.gateway_url);



const DEFAULT_GAS_LIMIT = "2000000";


async function getCoinPrice(network_config) {
    return new Promise((resolve, reject) => {
        fetch(network_config.native_coin_price_api, { method: "get", headers: { 'Content-Type': 'application/json' } })
            .then((res) => res.json())
            .then((json) => {
                resolve(json["USD"]);
            });
    })
}

async function getAbi(network_config) {
    let url = new URL(network_config.api_url);
    url.searchParams.set('module', 'contract');
    url.searchParams.set('action', 'getabi');
    url.searchParams.set('address', network_config.contract_address);
    url.searchParams.set('apikey', network_config.explorer_api_key);
    return new Promise((resolve, reject) => {
        fetch(url, { method: "get", headers: { 'Content-Type': 'application/json' } })
            .then((res) => res.json())
            .then((json) => {
                resolve(JSON.parse(json["result"]));
            });
    })
}

async function getContract(network_config, account_address) {
    const abi = await getAbi(network_config);
    const contract = new web3.eth.Contract(abi, network_config.contract_address, {
        from: account_address, // default from address
    });
    return contract;
}

async function makeContractCall(contracj_obj, method_name, params) {
    await contracj_obj.methods[method_name](...params).call({
        from: "",
        gas: DEFAULT_GAS_LIMIT
    }).then((result) => {
        console.log({ method_name, result });
    })
}

async function makeContractTransaction(contracj_obj, method_name, params, account) {
    const methodCall = contracj_obj.methods[method_name](...params);
    let gas = 0;

    await methodCall.estimateGas({
        from: account.address,
        gas: DEFAULT_GAS_LIMIT,
        value: '0'
    }).then(gasAmount => {
        console.log({ gasAmount });
        gas = gasAmount;
    }).catch(error => {
        console.error(error);
    });

    const tx = {
        from: account.address,
        to: contracj_obj._address,
        gas: DEFAULT_GAS_LIMIT,
        value: '0',
        data: methodCall.encodeABI()
    };
    return new Promise(function (resolve, reject) {
        web3.eth.accounts.signTransaction(tx, account.privateKey)
            .then((signed) => {
                web3.eth.sendSignedTransaction(signed.rawTransaction)
                    .on('transactionHash', (hash) => {
                        console.log({ msg: "transaction sent", transactionHash: hash });
                    })
                    // .on('receipt', (receipt) => {
                    //     console.log('transaction sent');
                    // })
                    .on('confirmation', (confirmationNumber, receipt) => {
                        if (confirmationNumber >= 1) {
                            resolve(receipt);
                        } else {
                            console.log({ msg: "transaction confirmed", confirmationNumber });
                        }
                    })
                    .on('error', console.error);
            });
    })
}

async function getGasPrice() {
    const networkId = await web3.eth.net.getId();
    console.log({ networkId });

    let gasPrice = await web3.eth.getGasPrice().then((result) => {
        console.log({ gasPriceInGwei: web3.utils.fromWei(result, 'gwei') });
        return result;
    });
    return gasPrice;
}

export { web3, getCoinPrice, getAbi, getContract, makeContractCall, makeContractTransaction, getGasPrice }