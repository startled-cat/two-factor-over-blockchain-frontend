import Web3 from 'web3';
import axios from 'axios';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import { BigNumber } from "bignumber.js";

import { networks, NetworkConfig, accounts, abi_local } from './Config';

export const DEFAULT_GAS_LIMIT = "2000000";

export function loadAccounts(web3: Web3) {
    accounts.forEach(acc => {
        web3.eth.accounts.wallet.add(acc.pk);
    })
}

export function getWeb3(network_config: NetworkConfig): Web3 {
    return new Web3(network_config.gateway_url);
}

export async function getContract(web3: Web3, network_config: NetworkConfig): Promise<Contract> {
    return new web3.eth.Contract(abi_local, network_config.contract_address);
}

export async function makeContractCall(contracj_obj: Contract, method_name: string, params: any[]): Promise<void> {
    await contracj_obj.methods[method_name](...params).call({
        from: "",// TODO: why is this empty?
        gas: DEFAULT_GAS_LIMIT
    }).then((result: any) => {
        console.log({ method_name, result });
    })
}

export async function getGasPrice(web3: Web3): Promise<BigNumber> {
    const networkId = await web3.eth.net.getId();
    console.log({ networkId });

    let gasPrice = await web3.eth.getGasPrice().then((result) => {
        console.log({ gasPriceInGwei: web3.utils.fromWei(result, 'gwei') });
        return new BigNumber(result);
    });
    return gasPrice;
}

// call checkAccess contract method
export async function checkAccess(web3: Web3, network_config: NetworkConfig, user: string, website: string): Promise<boolean> {
    const contract = await getContract(web3, network_config);
    const result = await contract.methods.checkAccess(user, website).call({ from: "", gas: DEFAULT_GAS_LIMIT });
    return result;
}

// call receiveAccess contract method
export async function receiveAccess(web3: Web3, network_config: NetworkConfig, user: string, website: string): Promise<void> {
    const contract = await getContract(web3, network_config);
    return contract.methods.receiveAccess(user).send({ from: website, gas: DEFAULT_GAS_LIMIT });
}

// export { web3, getCoinPrice, getAbi, getContract, makeContractCall, makeContractTransaction, getGasPrice }