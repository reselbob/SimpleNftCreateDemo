let loginToken = '';
let profile = {};

const setLoginToken = (token) => {loginToken = token;}
const getLoginToken = () => {return loginToken}
const setProfile = (profile) => {profile = profile;}
const getProfile = () => {return profile;}

// Function to initiate the MetaMask login process
async function loginWithMetaMask() {
    try {
        // Check if MetaMask is installed and connected
        if (typeof window.ethereum !== 'undefined') {
            // retrieve the accounts known to the MetaMask plugin ...
            const accounts = await window.ethereum.request({method: 'eth_requestAccounts'});
            // ... and choose the first one
            const address = accounts[0];

            const greeting = "You are about to login to a really cool site.";
            const nonce = generateRandomHexNonce(16);
            const message = `Login: ${greeting}\nNonce: ${nonce}`;

            // Sign the message with MetaMask
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, address],
            });

            // Send the Ethereum address, signature and custom message to the server
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({address, signature, message}),
            });

            if (response.ok) {
                const data = await response.json();
                const {token, address, profile} = data;
                setLoginToken(token);
                setProfile(profile);
                document.getElementById("loginButton").style.display = "none";
                if (!profile) {
                    document.getElementById("loginResponse").innerHTML = `Logged in at address ${address}.<br />Please enter your profile information:`;
                    showProfileUI();
                } else {
                    hideProfileUI();
                    document.getElementById("loginResponse").innerHTML = `Welcome: ${profile.firstName} ${profile.lastName}<br />Address: ${profile.address}`;
                }
            } else {
                document.getElementById("loginResponse").innerText = "Login failed. Please try again.";
            }
        } else {
            document.getElementById("loginResponse").innerText = "MetaMask is not installed or not connected.";
        }
    } catch (error) {
        console.error(error);
        document.getElementById("loginResponse").innerText = "An error occurred while logging in with MetaMask.";
    }
}

function generateRandomHexNonce(length) {
    if (typeof length !== 'number' || length <= 0) {
        throw new Error('Invalid length for nonce');
    }

    // Calculate the number of bytes needed for the desired hex length
    const numBytes = Math.ceil(length / 2);

    // Generate random bytes
    const randomBytes = new Uint8Array(numBytes);
    window.crypto.getRandomValues(randomBytes);

    // Convert random bytes to a hex string
    let hexNonce = '';
    for (let i = 0; i < numBytes; i++) {
        hexNonce += ('00' + randomBytes[i].toString(16)).slice(-2);
    }

    // Trim to the desired length
    hexNonce = hexNonce.slice(0, length);

    return '0x' + hexNonce;
}

async function processProfileData() {
    // Access form data
    const formData = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        email: document.getElementById('email').value,
    };

    const apiUrl = '/profile';

    // Perform the HTTP POST request using the Fetch API
    try {
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `${getLoginToken()}`
            },
            body: JSON.stringify(formData)
        });
        readOnlyProfileUI();

        if (res.status === 200) document.getElementById("postResponse").innerText = "Profile Saved";
        if (res.status === 201) document.getElementById("postResponse").innerText = "Profile Already Exists";
    } catch (error) {
        document.getElementById("postResponse").innerText = `${error.message}`
    }
    showProfileUI();
}

function showProfileUI() {
    // Get the div element by its ID
    const profileDiv = document.getElementById('profile');

    // Change the display style to 'block' to make it visible
    profileDiv.style.display = 'block';
}

function hideProfileUI() {
    // Get the div element by its ID
    const profileDiv = document.getElementById('profile');

    // Change the display style to 'none' to make it invisible
    profileDiv.style.display = 'none';
}

function readOnlyProfileUI() {
    // After saving the data, make the textboxes readonly and grayed out
    document.getElementById('firstName').readOnly = true;
    document.getElementById('firstName').classList.add('readonly');

    document.getElementById('lastName').readOnly = true;
    document.getElementById('lastName').classList.add('readonly');

    document.getElementById('email').readOnly = true;
    document.getElementById('email').classList.add('readonly');
}
