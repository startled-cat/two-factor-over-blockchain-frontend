
import { web3, getCoinPrice, getAbi, getContract, makeContractCall, makeContractTransaction, getGasPrice } from './Web3Client.js';
import { accounts, network_config } from './Config.js';
import { performance } from 'perf_hooks';


export const main = async () => {
    console.log(">>> initializing ... ");

    let gasPrice = await getGasPrice();


    const account_owner = web3.eth.accounts.privateKeyToAccount(accounts[0].pk);
    const account_user = web3.eth.accounts.privateKeyToAccount(accounts[1].pk);
    console.log({ account_owner: account_owner.address });
    console.log({ account_user: account_user.address });

    const contract = await getContract(network_config, account_owner.address);

    const getOtp = async () => {
        console.log(">>> calling otp ...");
        await makeContractCall(contract, "otp", [account_user.address]);
    }
    const generateOtp = async () => {
        console.log(">>> calling generateOtp ...");
        let receipt = await makeContractTransaction(contract, "generateOtp", [account_user.address], account_owner);
        console.log({ usedGas: receipt.gasUsed });
        let cost = `${gasPrice * receipt.gasUsed}`;
        console.log({ txnCostWei: cost, txnCostGwei: web3.utils.fromWei(cost, "gwei"), txnCost: web3.utils.fromWei(cost, "ether") });
        let coinPrice = await getCoinPrice(network_config);
        console.log({ txnPriceUsd: coinPrice * web3.utils.fromWei(cost, "ether") });


    }

    console.log(">>> ready");



    await getOtp();
    // const startTime = performance.now()
    // await generateOtp();
    // const endTime = performance.now()
    // console.log(`Call to generateOtp took ${endTime - startTime} milliseconds, (${(endTime - startTime) / 1000} s)`)

    // await getOtp();
}

// main()
