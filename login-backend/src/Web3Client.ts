import Web3 from 'web3';
import axios from 'axios';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import { BigNumber } from "bignumber.js";

import { networks, NetworkConfig } from './Config';

export const DEFAULT_GAS_LIMIT = "2000000";

export function getNetworkConfig(): NetworkConfig {
    return networks[networks.default];

}
export function getWeb3(network_config: NetworkConfig): Web3 {
    return new Web3(network_config.gateway_url);
}

export async function getCoinPrice(network_config: NetworkConfig): Promise<BigNumber> {
    return new Promise((resolve, _reject) => {
        axios.get(network_config.native_coin_price_api, {
            headers: { 'Content-Type': 'application/json' }
        })
            .then((res) => res.data)
            .then((json) => {
                resolve(json["USD"]);
            });
    })
}

export async function getAbi(network_config: NetworkConfig): Promise<AbiItem[]> {
    return new Promise((resolve, _reject) => {
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
                let abi: AbiItem[] = JSON.parse(json["result"])
                resolve(abi);
            });
    })
}


export async function getContract(web3: Web3, network_config: NetworkConfig): Promise<Contract> {
    const abi: AbiItem[] = await getAbi(network_config);
    return new web3.eth.Contract(abi, network_config.contract_address);
}

export async function makeContractCall(contracj_obj: Contract, method_name: string, params: any[]): Promise<void> {
    await contracj_obj.methods[method_name](...params).call({
        from: "",
        gas: DEFAULT_GAS_LIMIT
    }).then((result: any) => {
        console.log({ method_name, result });
    })
}

// async function makeContractTransaction(contracj_obj: Contract, method_name: string, params: any[], account) {
//     const methodCall = contracj_obj.methods[method_name](...params);
//     // let gas = 0;

//     await methodCall.estimateGas({
//         from: account.address,
//         gas: DEFAULT_GAS_LIMIT,
//         value: '0'
//     }).then((gasAmount: any) => {
//         console.log({ gasAmount });
//         // gas = gasAmount;
//     }).catch((error: any) => {
//         console.error(error);
//     });

//     const tx = {
//         from: account.address,
//         to: contracj_obj._address,
//         gas: DEFAULT_GAS_LIMIT,
//         value: '0',
//         data: methodCall.encodeABI()
//     };
//     return new Promise(function (resolve, _reject) {
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

export async function getGasPrice(web3: Web3): Promise<BigNumber> {
    const networkId = await web3.eth.net.getId();
    console.log({ networkId });

    let gasPrice = await web3.eth.getGasPrice().then((result) => {
        console.log({ gasPriceInGwei: web3.utils.fromWei(result, 'gwei') });
        return new BigNumber(result);
    });
    return gasPrice;
}

// export { web3, getCoinPrice, getAbi, getContract, makeContractCall, makeContractTransaction, getGasPrice }