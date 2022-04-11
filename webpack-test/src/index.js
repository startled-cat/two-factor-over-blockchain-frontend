import Web3 from 'web3';
import { web3, networks, getGasPrice, getContract, getCoinPrice, makeContractCall, loadLocalContractConfig, loadOnlineContractConfig } from "./Web3Client.js"
import "./styles/main.scss";
import { resolve } from 'url';

var contract;

var networksList;
var connectBtn;
var reloadBtn;
var giveAccessBtn;
var checkAccessBtn;
var accessInput;
var currentNetworkId = null;

var accounts;

var inputs;

const refreshStats = async () => {
    let network_config;
    if (currentNetworkId in networks) {
        network_config = networks[currentNetworkId];
    } else {
        document.getElementById("transactionPrice").innerHTML = "[transactionPrice]";
        document.getElementById("coinPrice").innerHTML = "[coinPrice].";
        document.getElementById("gasPrice").innerHTML = "[gasPrice]";
        return;
    }
    let gasPrice = await getGasPrice();
    let coinPrice = await getCoinPrice(network_config);

    document.getElementById("gasPrice").innerHTML = `gas price is ${window.web3.utils.fromWei(gasPrice, "gwei")} gwei`;
    document.getElementById("coinPrice").innerHTML = `coin price is $${coinPrice}`;

    contract.methods.giveAccess(accessInput.value, 600).estimateGas({
        from: accounts[0],
        gas: 2000000,
        value: '0'
    }).then(gasAmount => {
        let txnPrice = window.web3.utils.fromWei("" + (gasPrice * gasAmount), "ether");
        document.getElementById("transactionPrice").innerHTML = `gasAmount: ${gasAmount}, estimated fee: $${txnPrice * coinPrice} (${txnPrice}) `;
    }).catch(error => {
        // console.error(error);
    });
}

const initialize = async () => {
    let network_config;

    document.getElementById("transactionPrice").innerHTML = "loading...";
    document.getElementById("coinPrice").innerHTML = "loading...";
    document.getElementById("gasPrice").innerHTML = "loading...";
    document.getElementById("contractUrl").href = "#";
    document.getElementById("contractUrl").innerHTML = "Contract";


    if (currentNetworkId in networks) {
        network_config = networks[currentNetworkId];
    } else {
        document.getElementById("networkName").innerHTML = `[chain_id:${currentNetworkId}]`;
        console.error(`Missing configuration for chain_id : ${currentNetworkId}`);
        inputs.forEach(x => x.disabled = true);
        return false;
    }

    document.getElementById("networkName").innerHTML = network_config.name;
    document.getElementById("contractUrl").href = `${network_config.explorer_url}address/${network_config.contract_address}`;
    document.getElementById("contractUrl").innerHTML = "Contract@" + network_config.contract_address;

    (async () => {
        contract = await getContract(network_config);
        accounts = await window.web3.currentProvider.request({ method: 'eth_requestAccounts' });
    })();




    inputs.forEach(x => x.disabled = false);
    return true;


}

const setupEventListeners = async () => {
    window.ethereum.on('accountsChanged', async function (accounts) {
        console.log('accountsChanges', accounts);
    });

    // detect Network account change
    window.ethereum.on('networkChanged', async function (networkId) {
        console.log('networkChanged', networkId);
        currentNetworkId = networkId;
        initialize();
    });
}


const ethEnabled = async () => {
    if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        window.web3 = new Web3(window.ethereum);
        currentNetworkId = window.ethereum.networkVersion;
        console.log({ currentNetworkId });

        return true;
    } else if (windows.web3) {
        window.web3 = new Web3(window.web3.currentProvider)
        currentNetworkId = window.ethereum.networkVersion;
        console.log({ currentNetworkId });
    }

    return false;
}

const main = async () => {
    connectBtn = document.getElementById("connect");
    reloadBtn = document.getElementById("reload");
    giveAccessBtn = document.getElementById("giveAccessBtn");
    checkAccessBtn = document.getElementById("checkAccessBtn");
    accessInput = document.getElementById("accessInput");
    networksList = document.getElementById("networks");
    inputs = [giveAccessBtn, checkAccessBtn, accessInput];
    inputs.forEach(x => {
        console.log(x);
        x.disabled = true
    });
    setupEventListeners();

    setInterval(refreshStats, 1000)


    checkAccessBtn.onclick = async () => {
        let address = accessInput.value;
        let accounts = await window.web3.currentProvider.request({ method: 'eth_requestAccounts' });
        contract.methods.checkAccess(accounts[0], address).call().then(result => {
            console.log({ user: accounts[0], website: address, accessGiven: result });
            alert(`user: ${accounts[0]}\nwebsite: ${address}\naccessGiven: ${result}`);
        }).catch(error => {
            console.error(error);
        })
    }
    giveAccessBtn.onclick = async () => {
        let address = accessInput.value;
        giveAccessBtn.disabled = true;
        let accounts = await window.web3.currentProvider.request({ method: 'eth_requestAccounts' });
        let gasPrice = await getGasPrice();
        let gasEstimate = await new Promise((resolve) => {
            contract.methods.giveAccess(address, 600).estimateGas({
                from: accounts[0],
                gas: 2000000,
                value: '0'
            }).then(gasAmount => {
                resolve(gasAmount);
            }).catch(error => {
                resolve(2000000);
            });
        });
        // call method
        if (contract) {
            let x = new Promise(async (resolve, reject) => {
                let price = `${window.web3.utils.toWei('50', "gwei")}`;
                console.log({ price });
                let accounts = await window.web3.currentProvider.request({ method: 'eth_requestAccounts' });
                let options = {
                    from: accounts[0],
                    gas: gasEstimate + 10000,
                    gasPrice: price,
                    value: '0'
                };
                contract.methods.giveAccess(address, 600).send(options).on("confirmation", (confirmation, receipt, latestBlockHash) => {
                    if (confirmation <= 1) {
                        console.log({ confirmation });

                    }
                    if (confirmation == 1) {
                        resolve(receipt);
                    }
                }).on("error", (error) => {
                    reject(error)
                })
            }).then(receipt => {
                console.log({ receipt });
            }).catch(err => {
                console.error(err);
                alert(err.message);
            }).finally(() => {
                giveAccessBtn.disabled = false;
            })
        }



    }
    connectBtn.onclick = async () => {
        connectBtn.disabled = true;
        let connected = await ethEnabled();
        if (connected) {
            initialize();
        }
    }

    reloadBtn.onclick = async () => {
        loadOnlineContractConfig();
    }
    let network_ids = Object.keys(networks).filter(x => !x.includes("default"));
    console.log({ network_ids });

    let x = "";
    Object.keys(networks).forEach(chain_id => {
        x += `<li>${chain_id}:${networks[chain_id].name}</li>`
    })
    networksList.innerHTML = `Suported networks: <ol>${x}</ol>`;

}

window.addEventListener('load',
    function () {
        loadLocalContractConfig();
        main();
    }, false);


