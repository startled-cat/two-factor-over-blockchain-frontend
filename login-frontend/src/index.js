import "./styles/main.scss";
// import logoImage from './assets/images/logo.png';

// import axios 
import axios from 'axios';

const backendUrl = "http://localhost:3001";
var loginButton;

var mainContent;

var spinnerElement;
var dangerAlertElement;
var infoAlertElement;
var loggedInElement;

const showInfo = (info) => {
		infoAlertElement.innerHTML = info;
		infoAlertElement.style.display = "block";
		setTimeout(() => {
			infoAlertElement.style.display = "none";
		}
		, 5000);
}

const showError = (error) => {
	console.info({ "showError": error });
	dangerAlertElement.style.display = "block";
	dangerAlertElement.innerHTML = error;
}

const showOnlyMainContent = () => {
	mainContent.style.display = "block";
	spinnerElement.style.display = "none";
	dangerAlertElement.style.display = "none";
	infoAlertElement.style.display = "none";
	loggedInElement.style.display = "none";
}

const processLogin = async (login, pass) => {

	try {
		// hide mainContent
		mainContent.style.display = "none";
		// show spinner
		spinnerElement.style.display = "block";
		// hide alerts
		dangerAlertElement.style.display = "none";
		infoAlertElement.style.display = "none";



		let response = await sendLoginRequest(login, pass);
		console.log({ "sendLoginRequest": response });

		// if login response is null or undefined, show error
		if (response === null || response === undefined) {
			showOnlyMainContent();
			// show error
			showError("Login failed: login response is null or undefined");
		} else {
			// get login_request_id from reponse data
			let login_request_id = response.data.login_request_id;

			while (true) {
				// ask backend for login request status
				let loginRequestStatus = await sendLoginRequestStatusRequest(login_request_id);
				console.log({ "sendLoginRequestStatusRequest": loginRequestStatus });
				// show status in info alert
				showInfo(`Login request status: ${loginRequestStatus}`);

				if (loginRequestStatus === "COMPLETED") {

					// try to consume login resuest 
					let consumeLoginResponse = await sendConsumeLoginRequest(login_request_id);
					console.log({ "sendConsumeLoginRequest": consumeLoginResponse });
					// if consume login response is null or undefined, show error
					if (consumeLoginResponse === null || consumeLoginResponse === undefined) {
						// show error
						showError("Login failed");

					} else {
						// show logged in
						loggedInElement.style.display = "block";
					}
					break;
				} else if (loginRequestStatus === "PENDING" || loginRequestStatus === "PROCESSING") {
					// wait
					// sleep for 1 second
					await new Promise(resolve => setTimeout(resolve, 1000));
					// do nothing
				} else if (loginRequestStatus === "ERROR") {
					// show error
					showError("Login failed: " + response.data.error);
					break;
				} else {
					// show error
					showError("Login failed");
					break;
				}
			}
			// hide spinner
			spinnerElement.style.display = "none";
		}
	} catch (error) {
		console.error(error);
		showOnlyMainContent()
		showError(error);
	}
}

const sendConsumeLoginRequest = async (login_request_id) => {
	let response = await axios.delete(`${backendUrl}/login/${login_request_id}`);
	return response;
}


const sendLoginRequestStatusRequest = async (login_request_id) => {
	let response = await axios.get(`${backendUrl}/login/${login_request_id}`);
	// if resopnse status is not 200, show error
	if (response.status !== 200) {
		// show error
		showError("Login failed");
	}
	// if response status is 200, get login request status
	else {
		// return response.data.status;
		return response.data.status;
	}
}


const sendLoginRequest = async (login, pass) => {
	let resuestBody = {
		user: {
			login: login,
			password: pass
		},
		chain_id: 1337,
	}

	return axios.post(`${backendUrl}/login`, resuestBody)
		.then(response => {
			console.log(response);
			return response;
		}).catch(error => {
			console.dir(error.response);
			console.dir(error);
			return null;
		});
}


window.addEventListener('load',
	function () {
		mainContent = document.getElementById('main-content');

		spinnerElement = document.getElementById('spinner');

		dangerAlertElement = document.getElementById('danger-alert');
		infoAlertElement = document.getElementById('info-alert');
		

		loggedInElement = document.getElementById('logged-in');


		// hide unnecessary elements
		spinnerElement.style.display = "none";
		dangerAlertElement.style.display = "none";
		infoAlertElement.style.display = "none";
		loggedInElement.style.display = "none";

		// get login button
		loginButton = document.getElementById('login-button');
		loginButton.onclick = async () => {
			console.log('login button clicked');
			// get username and password
			let login = document.getElementById('username').value;
			let password = document.getElementById('password').value;
			processLogin(login, password);
		}
	}, false);

