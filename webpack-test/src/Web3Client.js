// import fetch from 'node-fetch';
import Web3 from 'web3';
import axios from "axios";


const networks = require("./networks.json");

const network_config = networks[networks.default];

// var web3 = new Web3(network_config.gateway_url);




const DEFAULT_GAS_LIMIT = "2000000";

async function getCoinPrice(network_config) {
    return new Promise((resolve, reject) => {
        axios.get(network_config.native_coin_price_api, {
            headers: { 'Content-Type': 'application/json' }
        })
            .then((res) => res.data)
            .then((json) => {
                resolve(json["USD"]);
            });
    })
}

async function getAbi(network_config) {
    return new Promise((resolve, reject) => {
        axios.get(network_config.api_url, {
            headers: { 'Content-Type': 'application/json' },
            params: {
                module: "contract",
                action: "getabi",
                address: network_config.contract_address,
                apikey: network_config.explorer_api_key,
            },
        })
            .then((res) => res.data)
            .then((json) => {
                resolve(JSON.parse(json["result"]));
            });
    })
}

async function getContract(network_config) {
    const abi = await getAbi(network_config);
    return new window.web3.eth.Contract(abi, network_config.contract_address);
}

async function makeContractCall(contracj_obj, method_name, params) {
    return new Promise((resolve, reject) => {
        contracj_obj.methods[method_name](...params).call({
            from: "",
            gas: DEFAULT_GAS_LIMIT
        }).then((result) => {
            console.log({ method_name, result });
            resolve(result);
        })
    })

}

// async function makeContractTransaction(contracj_obj, method_name, params, account) {
//     const methodCall = contracj_obj.methods[method_name](...params);
//     let gas = 0;

//     await methodCall.estimateGas({
//         from: account.address,
//         gas: DEFAULT_GAS_LIMIT,
//         value: '0'
//     }).then(gasAmount => {
//         console.log({ gasAmount });
//         gas = gasAmount;
//     }).catch(error => {
//         console.error(error);
//     });

//     const tx = {
//         from: account.address,
//         to: contracj_obj._address,
//         gas: DEFAULT_GAS_LIMIT,
//         value: '0',
//         data: methodCall.encodeABI()
//     };
//     return new Promise(function (resolve, reject) {
//         web3.eth.accounts.signTransaction(tx, account.privateKey)
//             .then((signed) => {
//                 web3.eth.sendSignedTransaction(signed.rawTransaction)
//                     .on('transactionHash', (hash) => {
//                         console.log({ msg: "transaction sent", transactionHash: hash });
//                     })
//                     // .on('receipt', (receipt) => {
//                     //     console.log('transaction sent');
//                     // })
//                     .on('confirmation', (confirmationNumber, receipt) => {
//                         if (confirmationNumber >= 1) {
//                             resolve(receipt);
//                         } else {
//                             console.log({ msg: "transaction confirmed", confirmationNumber });
//                         }
//                     })
//                     .on('error', console.error);
//             });
//     })
// }

async function getGasPrice() {
    let gasPrice = await window.web3.eth.getGasPrice().then((result) => {
        console.log({ gasPriceInGwei: window.web3.utils.fromWei(result, 'gwei') });
        return result;
    });
    return gasPrice;
}

// export { web3, getCoinPrice, getAbi, getContract, makeContractCall, makeContractTransaction, getGasPrice }
export { networks, getGasPrice, getContract, getCoinPrice, makeContractCall }