import Web3 from 'web3';
import { networks, getContract, getGasPrice, getCoinPrice, loadLocalContractConfig, checkIfUserGivenAccess } from "./PasswordlessClient.js"
import "./styles/main.scss";

const applications = require("./apps.json");
const requiredConfirmations = 2;
const giveAccessFor = 600;

var contract;

var networksList;
var applicationsElement;
var applicationsAccessStatusElements;
var applicationsGiveAccessBtnElements;
var refreshBtn;
var connectBtn;
var accountAddress;
var currentNetworkId = null;

var accounts;

var inputs;

const sleep = async (duration) => {
    return new Promise(resolve => setTimeout(resolve, duration));
}


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

        let stats = `Estimated fee: ${txn_price} ${network_config.coin} ($${usd_per_txn.toFixed(8)})`;
        document.getElementById("stats").innerHTML = stats;

        // document.getElementById("stats").innerHTML = `gas amount: ${gas_amount}, gas price: ${window.web3.utils.fromWei(gas_price, "gwei")} gwei, txn price: ${txn_price} ${network_config.coin}`;
        // document.getElementById("stats").innerHTML = `coin price is: 1${network_config.coin} = $${coin_price}`;
        // document.getElementById("stats").innerHTML = `estimated fee: $${usd_per_txn}, ${Number(txn_per_usd.toFixed(0)).toLocaleString()}tx/$1`;

    }).catch(error => {
        console.error("refreshStats");
        console.error(error);
    });
    (async () => {
        let accountBalance = await window.web3.eth.getBalance(accounts[0]);
        accountBalance = window.web3.utils.fromWei(`${accountBalance}`, "ether");
        accountAddress.innerHTML = `${accounts[0]} (balance: ${accountBalance} ${network_config.coin})`;
    })();



}

const initialize = async () => {
    let network_config;
    document.getElementById("contractUrl").href = "#";
    document.getElementById("contractUrl").innerHTML = "";

    if (!(currentNetworkId in networks)) {
        console.warn("No network config found for current network id: " + currentNetworkId + ". Using default config.");
        currentNetworkId = 1337;
    }

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
        console.log("Using window.ethereum");

        return true;
    } else if (window.web3) {
        window.web3 = new Web3(window.web3.currentProvider)
        currentNetworkId = window.ethereum.networkVersion;
        if (currentNetworkId == 1659742563159) {
            currentNetworkId = 1337
        }
        console.log("Using window.web3");
    }

    return false;
}

const refreshApplicationAccessStatus = async () => {
    console.log("refreshApplicationAccessStatus");
    let anyAccessGiven = false;

    // for each element in applicationsAccessStatuselements, check if access was given and update element contents
    Object.keys(applicationsAccessStatusElements).forEach(app => {
        checkIfAccessGivenToApplication(app).then(result => {
            let newStatus = result ? "given" : "not given";
            anyAccessGiven = anyAccessGiven || result;
            if (result || newStatus != applicationsAccessStatusElements[app].status) {
                applicationsAccessStatusElements[app].status = newStatus;
                if (result) {
                    let validDuration = ((result - Math.floor((Date.now() / 1000))) );
                    if(validDuration < 0)validDuration = 0;
                    let percentProgress = Math.floor(100*validDuration / giveAccessFor);
                    let x = `
                    <div class="progress">
                    <div class="progress-bar bg-success" style="width: ${percentProgress}%"  role="progressbar" aria-label="${validDuration}s" aria-valuenow="${percentProgress}" aria-valuemin="0" aria-valuemax="100">${validDuration}s</div>
                    </div>`;
                    applicationsAccessStatusElements[app].info.innerHTML = x;
                    applicationsAccessStatusElements[app].element.innerHTML = "✅ You can now sign in to app! ✅";
                    applicationsAccessStatusElements[app].element.className = "access access-given disabled btn btn-outline-success";
                    applicationsAccessStatusElements[app].giveAccessBtn.disabled = true;
                } else {
                    applicationsAccessStatusElements[app].info.innerHTML = "";
                    applicationsAccessStatusElements[app].element.innerHTML = "Access not given";
                    applicationsAccessStatusElements[app].element.className = "access access-not-given disabled btn btn-outline-secondary";
                    applicationsAccessStatusElements[app].giveAccessBtn.disabled = false;
                }
            }
        }).catch(error => {
            console.error(error);
        });
    });

    setTimeout(() => {
        if (anyAccessGiven) {
            refreshApplicationAccessStatus();
        }
    }, 1000);
}


const giveAccessToAplication = async (app) => {
    applicationsGiveAccessBtnElements[app].disabled = true;

    applicationsAccessStatusElements[app].element.innerHTML = "Continue in wallet ...";
    applicationsAccessStatusElements[app].element.className = "access access-given disabled btn btn-outline-info";

    let address = getApplicationAddress(app);

    console.log({ address });
    // call method
    if (contract) {
        new Promise(async (resolve, reject) => {
            let gasPrice = await getGasPrice();
            let accounts = await window.web3.currentProvider.request({ method: 'eth_requestAccounts' });
            let options = {
                from: accounts[0],
                gas: 1000000,
                gasPrice: gasPrice,
                value: '0'
            };
            console.log({ options });

            contract.methods.giveAccess(address, giveAccessFor).send(options)
                .on("confirmation", (confirmation, receipt, latestBlockHash) => {
                    if (confirmation <= requiredConfirmations) {
                        applicationsAccessStatusElements[app].element.innerHTML = `Waiting for confirmation (${confirmation}/${requiredConfirmations})...`;
                        console.log({ confirmation });
                        if (confirmation == requiredConfirmations) {
                            resolve(receipt);
                        }
                    }
                }).on("error", (error) => {
                    applicationsAccessStatusElements[app].element.innerHTML = "Error";
                    reject(error)
                }).on("transactionHash", (transactionHash) => {
                    applicationsAccessStatusElements[app].element.innerHTML = "Waiting for confirmation ...";
                    console.log({ transactionHash });
                });
        }).then(receipt => {
            console.log({ receipt });
            applicationsGiveAccessBtnElements[app].disabled = true;
        }).catch(err => {
            applicationsGiveAccessBtnElements[app].disabled = false;
            console.error(err);
            applicationsAccessStatusElements[app].element.innerHTML = "Error, try again";
            applicationsAccessStatusElements[app].element.className = "access access-given disabled btn btn-outline-danger";
            alert("Error giving access to application. Please try again.");
        }).finally(() => {
            
            refreshApplicationAccessStatus();
        })
    }
}


const checkIfAccessGivenToApplication = async (application) => {
    let address = getApplicationAddress(application);

    let accounts;
    
    // try to get accounts from web3
    try {
        accounts = await window.web3.currentProvider.request({ method: 'eth_requestAccounts' });
    } catch (error) {
        // console.warn(error);
        // if error, try again, after waiting for a moment
        await sleep(3000);
        return checkIfAccessGivenToApplication(application);
        
    }


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
    accountAddress = document.getElementById("accountAddress");
    applicationsAccessStatusElements = {};
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
        let appElement = document.createElement("li");

        // let appEmoji = document.createElement("span");
        // appEmoji.className = "emoji";
        // appEmoji.innerHTML = applications[app].emoji;
        // appElement.appendChild(appEmoji)

        appElement.className = "list-group-item";
        let appName = document.createElement("h3");
        appName.innerHTML = `${applications[app].emoji} ${applications[app].name}`;
        appName.onclick = async () => {
            refreshApplicationAccessStatus();
        }
        appElement.appendChild(appName);
        let appDescription = document.createElement("p");
        appDescription.innerHTML = applications[app].description;
        appElement.appendChild(appDescription);

        // create button group
        let appButtons = document.createElement("btn-group");
        appButtons.className = "btn-group";
        appElement.appendChild(appButtons);

        // create a button to give access
        let giveAccessBtn = document.createElement("button");
        giveAccessBtn.innerHTML = "Give access";
        giveAccessBtn.className = "btn btn-primary";
        applicationsGiveAccessBtnElements[app] = giveAccessBtn;
        giveAccessBtn.onclick = async () => {
            giveAccessToAplication(app)
        };
        appButtons.appendChild(giveAccessBtn);

        // create an alert to display transaction information
        let accessInfo = document.createElement("div");
        accessInfo.className = "";
        accessInfo.innerHTML = "";
        appElement.appendChild(accessInfo);


        let accessElement = document.createElement("button");
        accessElement.innerHTML = "loading...";
        accessElement.className = "access access-not-given btn btn-secondary";
        applicationsAccessStatusElements[app] = {
            "giveAccessBtn": giveAccessBtn,
            "element": accessElement,
            "status": null,
            "info": accessInfo
        };
        appButtons.appendChild(accessElement);



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
            console.log('chainChanged', networkId);
            currentNetworkId = networkId;
            initialize();
            refreshApplicationAccessStatus();

        });

        loadLocalContractConfig();
        main();
        connectToWallet();
        refreshApplicationAccessStatus();

        // this.setInterval(refreshApplicationAccessStatus, 1000);
    }, false);


