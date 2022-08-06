// import fetch from 'node-fetch';
// import Web3 from 'web3';
import axios from "axios";


const networks = require("./networks.json");
const abi_file = require("./abi.json");
const map_file = require("./map.json");
const local_abi = abi_file["abi"]

// const DEFAULT_GAS_LIMIT = "1000000";
const map_url = "https://raw.githubusercontent.com/startled-cat/two-factor-over-blockchain/main/passwordless_auth/build/deployments/map.json";
const contract_name = "PasswordlessAuthentication";
const coin_price_url = "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD";

var contract = null;

function loadMap(chain_to_contract_map) {
    Object.keys(chain_to_contract_map).forEach(chain_id => {
        if (contract_name in chain_to_contract_map[chain_id]) {
            if (!(chain_id in networks)) {
                networks[chain_id] = {};
            }
            networks[chain_id].contract_address = chain_to_contract_map[chain_id]["" + contract_name][0];
        } else {
            console.warn(`Contract not deployed on network: ${chain_id}`)
        }
    });
}
export async function loadLocalContractConfig() {
    loadMap(map_file);
    console.log({ networks });

}
export async function loadOnlineContractConfig() {

    let chain_to_contract_map = {};
    // get map from repo
    await axios.get(map_url).then(response => {
        if (response.status == 200) {
            chain_to_contract_map = response.data;
        } else {
            throw new Error(`GET ${map_url} response status = ${response.status}`);
        }
    }).catch(error => {
        chain_to_contract_map = {};
        console.error(error);
        throw new Error(error);
    });
    loadMap(chain_to_contract_map);
    console.log({ networks });
}

// coin_price_url
async function getCoinPrice(network_config) {
    return new Promise((resolve, reject) => {
        if ("coin" in network_config) {
            axios.get(coin_price_url.replace("ETH", network_config.coin), {
                headers: { 'Content-Type': 'application/json' }
            })
                .then((res) => res.data)
                .then((json) => {
                    resolve(json["USD"]);
                }).catch(error => {
                    console.error(error)
                });
        } else {
            console.warn("Missing coin symbol from network config");
        }

    })
}

async function getContract(network_config) {
    contract = new window.web3.eth.Contract(local_abi, network_config.contract_address)
    return contract;
}

// async function makeContractCall(contracj_obj, method_name, params) {
//     return new Promise((resolve, reject) => {
//         contracj_obj.methods[method_name](...params).call({
//             from: "",
//             gas: DEFAULT_GAS_LIMIT
//         }).then((result) => {
//             console.log({ method_name, result });
//             resolve(result);
//         })
//     })
// }

async function getGasPrice() {
    return window.web3.eth.getGasPrice();
}


const checkIfUserGivenAccess = async (userAddresss, applicationAddress) => {
    if (contract) {
        let result =  await contract.methods.checkAccess(userAddresss, applicationAddress).call();
        if(result){
            let timeLeft = await contract.methods.givenAccessUntill(userAddresss, applicationAddress).call();
            return timeLeft;
        }else{
            return false;
        }
    }
}

export { networks, getGasPrice, getContract, getCoinPrice, checkIfUserGivenAccess}

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
