import Web3 from 'web3';
import { networks, getContract, getGasPrice, getCoinPrice, loadLocalContractConfig, checkIfUserGivenAccess } from "./PasswordlessClient.js"
import "./styles/main.scss";

const applications = require("./apps.json");
const requiredConfirmations = 2;
const giveAccessFor = 600;

var contract;

var networksList;
var applicationsElement;
var applicationsAccessStatuselements;
var applicationsGiveAccessBtnElements;
var refreshBtn;
var connectBtn;
var accessInput;
var currentNetworkId = null;

var accounts;

var inputs;


const refreshStats = () => {

    let network_config;
    if (currentNetworkId in networks) {
        network_config = networks[currentNetworkId];
    } else {
        document.getElementById("transactionPrice").innerHTML = "[transactionPrice]";
        document.getElementById("coinPrice").innerHTML = "[coinPrice].";
        document.getElementById("gasPrice").innerHTML = "[gasPrice]";
        return;
    }

    let anyAppAddress = getApplicationAddress(Object.keys(applications)[0]);
    console.log({ anyAppAddress });

    Promise.all([
        getGasPrice(),
        getCoinPrice(network_config),
        contract.methods.giveAccess(anyAppAddress, giveAccessFor).estimateGas({
            from: accounts[0],
            gas: 1000000,
            value: '0'
        })
    ]).then(x => {
        let gas_price = x[0];
        let coin_price = x[1];
        let gas_amount = x[2];
        let txn_price = window.web3.utils.fromWei("" + (gas_price * gas_amount), "ether");
        let usd_per_txn = txn_price * coin_price;
        let txn_per_usd = 1 / usd_per_txn;

        let stats = `Estimated fee: $${usd_per_txn.toFixed(4)} (${txn_price} ${network_config.coin})`;
        document.getElementById("stats").innerHTML = stats;

        // document.getElementById("stats").innerHTML = `gas amount: ${gas_amount}, gas price: ${window.web3.utils.fromWei(gas_price, "gwei")} gwei, txn price: ${txn_price} ${network_config.coin}`;
        // document.getElementById("stats").innerHTML = `coin price is: 1${network_config.coin} = $${coin_price}`;
        // document.getElementById("stats").innerHTML = `estimated fee: $${usd_per_txn}, ${Number(txn_per_usd.toFixed(0)).toLocaleString()}tx/$1`;

    }).catch(error => {
        console.error("refreshStats");
        console.error(error);
    });
}

const initialize = async () => {
    let network_config;
    document.getElementById("contractUrl").href = "#";
    document.getElementById("contractUrl").innerHTML = "";


    if (currentNetworkId in networks) {
        network_config = networks[currentNetworkId];
    } else {
        document.getElementById("networkName").innerHTML = `[chain_id:${currentNetworkId}]`;
        alert(`Missing configuration for chain_id : ${currentNetworkId}`);
        return false;
    }

    document.getElementById("networkName").innerHTML = network_config.name + `[chain_id:${currentNetworkId}]`;
    document.getElementById("contractUrl").href = `${network_config.explorer_url}address/${network_config.contract_address}`;
    document.getElementById("contractUrl").innerHTML = "" + network_config.contract_address;

    (async () => {
        contract = await getContract(network_config);
        accounts = await window.web3.currentProvider.request({ method: 'eth_requestAccounts' });
        refreshStats();
    })();
    return true;
}



const ethEnabled = async () => {
    if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        window.web3 = new Web3(window.ethereum);
        currentNetworkId = window.ethereum.networkVersion;
        if (currentNetworkId == 1659742563159) {
            currentNetworkId = 1337
        }
        console.log({ currentNetworkId });

        return true;
    } else if (windows.web3) {
        window.web3 = new Web3(window.web3.currentProvider)
        currentNetworkId = window.ethereum.networkVersion;
        if (currentNetworkId == 1659742563159) {
            currentNetworkId = 1337
        }
        console.log({ currentNetworkId });
    }

    return false;
}

const refreshApplicationAccessStatus = async () => {
    console.log("refreshApplicationAccessStatus");

    // for each element in applicationsAccessStatuselements, check if access was given and update element contents
    Object.keys(applicationsAccessStatuselements).forEach(app => {
        checkIfAccessGivenToApplication(app).then(result => {
            if (result) {
                applicationsAccessStatuselements[app].innerHTML = "Access given ✅";
                applicationsAccessStatuselements[app].className = "access access-given";
            } else {
                applicationsAccessStatuselements[app].innerHTML = "Access not given ";
                applicationsAccessStatuselements[app].className = "access access-not-given";
            }
        }).catch(error => {
            console.error(error);
        });
    });
}


const giveAccessToAplication = async (app) => {
    applicationsGiveAccessBtnElements[app].disabled = true;

    let address = applications[app]["addresses"][currentNetworkId];
    // call method
    if (contract) {
        new Promise(async (resolve, reject) => {
            let gasPrice = getGasPrice();
            let accounts = await window.web3.currentProvider.request({ method: 'eth_requestAccounts' });
            let options = {
                from: accounts[0],
                gas: 1000000,
                gasPrice: gasPrice,
                value: '0'
            };
            contract.methods.giveAccess(address, giveAccessFor).send(options).on("confirmation", (confirmation, receipt, latestBlockHash) => {
                if (confirmation == requiredConfirmations) {
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
            applicationsGiveAccessBtnElements[app].disabled = false;
        })
    }
}


const checkIfAccessGivenToApplication = async (application) => {
    let address = getApplicationAddress(application);
    let accounts = await window.web3.currentProvider.request({ method: 'eth_requestAccounts' });
    return checkIfUserGivenAccess(accounts[0], address);
}

const connectToWallet = async () => {
    connectBtn.disabled = true;
    let connected = await ethEnabled();
    if (connected) {
        initialize();
    }
}


const getApplicationAddress = (application) => {
    let id = currentNetworkId;
    let addresses = applications[application]["addresses"];
    if (addresses[id]) {
        return addresses[id];
    }
    return addresses["*"];
}




const main = async () => {
    refreshBtn = document.getElementById("refreshBtn");
    connectBtn = document.getElementById("connect");
    networksList = document.getElementById("networks");
    applicationsElement = document.getElementById("applications");
    applicationsAccessStatuselements = {};
    applicationsGiveAccessBtnElements = {};

    refreshBtn.onclick = async () => {
        refreshStats();
    };
    connectBtn.onclick = async () => {
        connectToWallet();
    }

    let network_ids = Object.keys(networks).filter(x => !x.includes("default"));
    console.log({ network_ids });

    let x = "";
    Object.keys(networks).forEach(chain_id => {
        x += `<li>${networks[chain_id].name} (${chain_id})</li>`
    })
    networksList.innerHTML = `Suported networks: <ul>${x}</ul>`;


    // for each application, display its information and create a button
    Object.keys(applications).forEach(app => {
        let appElement = document.createElement("div");
        appElement.className = "app";
        let appName = document.createElement("h3");
        appName.innerHTML = applications[app].name;
        appElement.appendChild(appName);
        let appDescription = document.createElement("p");
        appDescription.innerHTML = applications[app].description;
        appElement.appendChild(appDescription);

        // create a link to app
        let appLink = document.createElement("a");
        appLink.href = applications[app].url;
        appLink.innerHTML = "Go to app";
        appElement.appendChild(appLink);

        // if access was given, display green checkmark, else display grey cross
        let accessElement = document.createElement("div");
        accessElement.className = "access";
        applicationsAccessStatuselements[app] = accessElement;
        applicationsAccessStatuselements[app].innerHTML = "loading...";
        applicationsAccessStatuselements[app].className = "access access-not-given";
        appElement.appendChild(accessElement);

        // create a button to give access
        let giveAccessBtn = document.createElement("button");
        giveAccessBtn.innerHTML = "Give access";
        giveAccessBtn.className = "btn btn-primary";
        applicationsGiveAccessBtnElements[app] = giveAccessBtn;
        giveAccessBtn.onclick = async () => {
            giveAccessToAplication(app)
        };
        appElement.appendChild(giveAccessBtn);



        applicationsElement.appendChild(appElement);
    });

}

window.addEventListener('load',
    function () {

        window.ethereum.on('accountsChanged', async function (accounts) {
            console.log('accountsChanges', accounts);
        });

        // detect Network account change
        window.ethereum.on('chainChanged', async function (networkId) {
            if (networkId == 1659742563159) {
                networkId = 1337
            }
            console.log('chainChanged', networkId);
            currentNetworkId = networkId;
            initialize();
        });

        loadLocalContractConfig();
        main();
        connectToWallet();
        refreshApplicationAccessStatus();

        this.setInterval(refreshApplicationAccessStatus, 1000);
    }, false);


