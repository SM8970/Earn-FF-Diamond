// DOM Elements
const authSection = document.getElementById('auth-section');
const mainAppSection = document.getElementById('main-app-section');
const loginBtn = document.getElementById('login-btn');
const ffUidLoginInput = document.getElementById('ff-uid-login');
const authStatus = document.getElementById('auth-status');

const userDisplayId = document.getElementById('user-display-id');
const userFFUidDisplay = document.getElementById('user-ff-uid-display');
const tokenBalanceDisplay = document.getElementById('token-balance');
const logoutBtn = document.getElementById('logout-btn');

const tapBtn = document.getElementById('tap-btn');
const tapsForSpinDisplay = document.getElementById('taps-for-spin');

const spinBtn = document.getElementById('spin-btn');
const wheelImg = document.getElementById('wheel-img'); // We'll just use a placeholder
const spinResultDisplay = document.getElementById('spin-result');
const spinCountDisplay = document.getElementById('spin-count');

const redeemBtn = document.getElementById('redeem-btn');
const redeemStatus = document.getElementById('redeem-status');
const redeemAmountInput = document.getElementById('redeem-amount');


const adModal = document.getElementById('ad-modal');
const adTimerDisplay = document.getElementById('ad-timer');
const skipAdBtn = document.getElementById('skip-ad-btn');

// App State
let currentUser = null;
let userTokens = 0;
let userFFUID = null;
let tapsDone = 0;
const TAPS_TO_UNLOCK_SPIN = 10; // How many taps unlock spins
const SPINS_UNLOCKED_COUNT = 5; // How many spins are granted (your "200 spins" is a lot for a simple tap cycle)
let availableSpins = 0;
let adRewardCallback = null; // Function to call after ad finishes

// --- Authentication ---
loginBtn.addEventListener('click', async () => {
    const ffUid = ffUidLoginInput.value.trim();
    if (!ffUid) {
        authStatus.textContent = "Please enter your Free Fire UID.";
        return;
    }
    authStatus.textContent = "Logging in...";
    try {
        // Using anonymous sign-in for simplicity and linking FF UID
        // In a real app, you might use email/password and then prompt for FF UID
        const userCredential = await auth.signInAnonymously();
        currentUser = userCredential.user;
        userFFUID = ffUid; // Store FF UID from input
        
        // Save or update FF UID in Firestore
        await db.collection('users').doc(currentUser.uid).set({
            freeFireUID: ffUid,
            tokens: firebase.firestore.FieldValue.serverTimestamp() // Initialize if not exists
        }, { merge: true });


        authStatus.textContent = "Logged in successfully!";
        loadUserData();
        authSection.style.display = 'none';
        mainAppSection.style.display = 'block';

    } catch (error) {
        console.error("Login error:", error);
        authStatus.textContent = `Error: ${error.message}`;
    }
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        await loadUserData(); // Make sure to load data including FF UID if already logged in
        if(userFFUID) { // Only show app if FF UID is known
            authSection.style.display = 'none';
            mainAppSection.style.display = 'block';
            userDisplayId.textContent = currentUser.uid.substring(0,6); // Show partial UID
            userFFUidDisplay.textContent = userFFUID;
        } else {
            // If auth is persistent but we don't have ff_uid yet, show login
             authSection.style.display = 'block';
             mainAppSection.style.display = 'none';
             authStatus.textContent = "Please provide your Free Fire UID to continue.";
        }
    } else {
        currentUser = null;
        userTokens = 0;
        userFFUID = null;
        availableSpins = 0;
        tapsDone = 0;
        authSection.style.display = 'block';
        mainAppSection.style.display = 'none';
        userDisplayId.textContent = '';
        userFFUidDisplay.textContent = '';
        tokenBalanceDisplay.textContent = '0';
        spinCountDisplay.textContent = '0';
        tapsForSpinDisplay.textContent = TAPS_TO_UNLOCK_SPIN;
        authStatus.textContent = "You are logged out.";
    }
});

logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
});

async function loadUserData() {
    if (!currentUser) return;
    const userDocRef = db.collection('users').doc(currentUser.uid);
    const docSnap = await userDocRef.get();

    if (docSnap.exists) {
        const data = docSnap.data();
        userTokens = data.tokens || 0;
        userFFUID = data.freeFireUID || null; // Load FF UID
        availableSpins = data.availableSpins || 0;
        tapsDone = data.tapsDoneForSpin || 0;

        tokenBalanceDisplay.textContent = userTokens;
        userFFUidDisplay.textContent = userFFUID || "Not set";
        spinCountDisplay.textContent = availableSpins;
        tapsForSpinDisplay.textContent = Math.max(0, TAPS_TO_UNLOCK_SPIN - tapsDone);
        updateSpinButtonState();

    } else {
        // New user, set default values (FF UID handled at login)
        await userDocRef.set({ tokens: 0, freeFireUID: userFFUID, availableSpins: 0, tapsDoneForSpin: 0 }, { merge: true });
        userTokens = 0;
        availableSpins = 0;
        tapsDone = 0;
        tokenBalanceDisplay.textContent = '0';
        spinCountDisplay.textContent = '0';
        tapsForSpinDisplay.textContent = TAPS_TO_UNLOCK_SPIN;
    }
}


// --- Ad Simulation ---
function showAd(onComplete) {
    adRewardCallback = onComplete;
    adModal.style.display = 'block';
    lettimeLeft = 5;
    adTimerDisplay.textContent = timeLeft;
    skipAdBtn.style.display = 'none';

    const timerInterval = setInterval(() => {
        timeLeft--;
        adTimerDisplay.textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            adTimerDisplay.textContent = "Ad Finished!";
            skipAdBtn.style.display = 'block';
        }
    }, 1000);
}

skipAdBtn.addEventListener('click', () => {
    adModal.style.display = 'none';
    if (adRewardCallback) {
        adRewardCallback();
        adRewardCallback = null;
    }
});

// --- Tap to Earn ---
tapBtn.addEventListener('click', () => {
    tapBtn.disabled = true; // Prevent multiple clicks
    showAd(async () => { // This is the onComplete callback
        const tokensEarned = 1; // Example: 1 token per ad tap
        userTokens += tokensEarned;
        tapsDone++;

        if (tapsDone >= TAPS_TO_UNLOCK_SPIN) {
            availableSpins += SPINS_UNLOCKED_COUNT; // Your 200 spins if you meant it this way
            tapsDone = 0; // Reset tap counter for next spin unlock
            spinCountDisplay.textContent = availableSpins;
        }
        
        tapsForSpinDisplay.textContent = TAPS_TO_UNLOCK_SPIN - tapsDone;
        tokenBalanceDisplay.textContent = userTokens;
        updateSpinButtonState();

        try {
            await db.collection('users').doc(currentUser.uid).update({
                tokens: firebase.firestore.FieldValue.increment(tokensEarned),
                tapsDoneForSpin: tapsDone,
                availableSpins: availableSpins
            });
            console.log("Tap reward and state saved");
        } catch (error) {
            console.error("Error saving tap reward:", error);
            // Handle error - maybe revert local state
        }
        tapBtn.disabled = false;
    });
});

function updateSpinButtonState() {
    spinBtn.disabled = availableSpins <= 0;
}


// --- Spin Wheel ---
spinBtn.addEventListener('click', async () => {
    if (availableSpins <= 0) return;
    
    spinBtn.disabled = true;
    availableSpins--;
    spinCountDisplay.textContent = availableSpins;

    // Simulate spin
    wheelImg.style.transform = `rotate(${Math.random() * 360 * 5}deg)`; // Visual cue
    wheelImg.style.transition = 'transform 2s ease-out';

    setTimeout(async () => { // Simulate time for spin animation
        const spinRewards = [10, 20, 5, 50, 15, 0, 25]; // Possible token amounts from spin
        const earnedFromSpin = spinRewards[Math.floor(Math.random() * spinRewards.length)];
        userTokens += earnedFromSpin;
        tokenBalanceDisplay.textContent = userTokens;
        spinResultDisplay.textContent = `You won ${earnedFromSpin} tokens!`;

        try {
            await db.collection('users').doc(currentUser.uid).update({
                tokens: firebase.firestore.FieldValue.increment(earnedFromSpin),
                availableSpins: availableSpins
            });
            console.log("Spin reward saved");
        } catch (error) {
            console.error("Error saving spin reward:", error);
            // Handle error
        }
        
        wheelImg.style.transition = 'none'; // Reset for next spin
        updateSpinButtonState();
    }, 2000); // Corresponds to animation time
});


// --- Redemption ---
redeemBtn.addEventListener('click', async () => {
    const tokensToRedeem = parseInt(redeemAmountInput.value); // Example fixed value
    const costOfRedemption = 1000; // Fixed cost for 100 Diamonds (example)

    if (!userFFUID) {
        redeemStatus.textContent = "Error: Your Free Fire UID is not set. Please re-login.";
        return;
    }

    if (userTokens < costOfRedemption) {
        redeemStatus.textContent = "Not enough tokens!";
        return;
    }

    redeemBtn.disabled = true;
    redeemStatus.textContent = "Processing...";

    try {
        // 1. Deduct tokens from user
        await db.collection('users').doc(currentUser.uid).update({
            tokens: firebase.firestore.FieldValue.increment(-costOfRedemption)
        });

        // 2. Log redemption request for admin
        await db.collection('redemptions').add({
            userId: currentUser.uid,
            freeFireUID: userFFUID, // Use the FF UID stored for the user
            tokensRedeemed: costOfRedemption,
            diamondsRequested: 100, // Corresponding diamond amount
            status: "pending", // Admin will change this to "completed"
            requestedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        userTokens -= costOfRedemption;
        tokenBalanceDisplay.textContent = userTokens;
        redeemStatus.textContent = `Redemption request for 100 Diamonds sent! Admin will process it.`;
        console.log("Redemption successful on client, logged for admin.");

    } catch (error) {
        console.error("Redemption error:", error);
        redeemStatus.textContent = `Error: ${error.message}. Tokens might not have been deducted.`;
        // Potentially add tokens back if deduction succeeded but logging failed - complex!
    } finally {
        redeemBtn.disabled = false;
    }
});

// Initial load
auth.onAuthStateChanged(user => {
    // Logic is already in the onAuthStateChanged listener above
});
