// Wrap the entire script in an Immediately Invoked Function Expression (IIFE)
// This creates a private scope for variables like 'jwtToken', preventing global
// redeclaration errors if the script is loaded multiple times or concatenated.
(function() {

    // --- DOM Element References ---
    // Form Steps
    const step1Section = document.getElementById('step1');
    const step2Section = document.getElementById('step2');
    const nextStepButton = document.getElementById('nextStepButton');
    const backStepButton = document.getElementById('backStepButton');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    // Vehicle Details
    const modelYearSelect = document.getElementById('modelYear');
    const makeSelect = document.getElementById('make');
    const modelSelect = document.getElementById('model');
    const trimSelect = document.getElementById('trim');
    const bodyTypeSelect = document.getElementById('bodyType');
    const engineSizeSelect = document.getElementById('engineSize');
    const doorsSelect = document.getElementById('doorsSelect');
    const transmissionSelect = document.getElementById('transmissionSelect');
    const cylinderSelect = document.getElementById('cylinderSelect');
    const citySelect = document.getElementById('citySelect');
    const ncdSelect = document.getElementById('ncdSelect');

    // Sum Insured Elements
    const sumInsuredTextInput = document.getElementById('sumInsuredTextInput');
    const sumInsuredRangeText = document.getElementById('sum-insured-range-text');
    const sumInsuredTextInputError = document.getElementById('sumInsuredTextInputError');
    const sumInsuredRangeDescription = document.getElementById('sum-insured-range-description');
    const sumInsuredContainer = document.getElementById('sumInsuredContainer');
    const sumInsuredSlider = document.getElementById('sumInsuredSlider');
    const sumInsuredMinLabel = document.getElementById('sumInsuredMinLabel');
    const sumInsuredMaxLabel = document.getElementById('sumInsuredMaxLabel');
    const sumInsuredErrorDisplay = document.getElementById('sumInsuredErrorDisplay');

    // Owner Details
    const ownerNameInput = document.getElementById('ownerNameInput');
    const nationalitySelect = document.getElementById('nationalitySelect');
    const ownerEmailInput = document.getElementById('ownerEmailInput');
    const ownerMobileInput = document.getElementById('ownerMobileInput');
    const ownerDobInput = document.getElementById('ownerDobInput');
    const driverAgeDisplay = document.getElementById('driverAgeDisplay');
    const licenseIssueDateInput = document.getElementById('licenseIssueDateInput');

    // Form, Results, Token Display
    const quoteForm = document.getElementById('quoteForm');
    const quoteResultDiv = document.getElementById('quoteResult'); // This will no longer be used for display on this page
    const tokenDisplayDiv = document.getElementById('tokenDisplay');

    // Modal Elements
    const errorModal = document.getElementById('errorModal');
    const errorModalContent = document.getElementById('errorModalContent');
    const errorMessageText = document.getElementById('errorMessageText');
    const closeErrorModalButtonTop = document.getElementById('closeErrorModalButtonTop');
    const closeErrorModalButtonBottom = document.getElementById('closeErrorModalButtonBottom');

    // --- Global Variables (now scoped within the IIFE) ---
    // jwtToken is now local to this IIFE, preventing global redeclaration issues.
    let jwtToken = "";
    let vehicleLowValue = null;
    let vehicleHighValue = null;
    let vehicleMediumValue = null;
    let makeChoicesInstance = null;
    let modelChoicesInstance = null;
    let nationalityChoicesInstance = null;
    // Add new Choices instances for other dropdowns
    let modelYearChoicesInstance = null;
    let trimChoicesInstance = null;
    let bodyTypeChoicesInstance = null;
    let engineSizeChoicesInstance = null;
    let doorsChoicesInstance = null;
    let transmissionChoicesInstance = null;
    let cylinderChoicesInstance = null;
    let cityChoicesInstance = null; // Assuming city is also a Choices instance
    let ncdChoicesInstance = null;   // Assuming ncd is also a Choices instance

    window.choicesInstances = window.choicesInstances || {};

    // --- Helper Functions ---
    function decodeJwtPayload(token) {
        if (!token) return null;
        try {
            const base64Url = token.split('.')[1];
            if (!base64Url) return null;
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Error decoding JWT payload:", e);
            return null;
        }
    }

    function formatCurrency(value) {
        if (typeof value !== 'number' || isNaN(value)) return '--';
        return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function resetDropdown(elementOrInstance, placeholderText, disable = true) {
        // Check if it's the sumInsuredTextInput (special handling)
        if (elementOrInstance && elementOrInstance.id === 'sumInsuredTextInput') {
            const inputElement = elementOrInstance; // It's the actual input element
            inputElement.value = '';
            inputElement.placeholder = placeholderText;
            inputElement.disabled = disable;

            // Reset related sum insured UI elements
            if (sumInsuredSlider) {
                // Attempt to set a sensible default or min. Ensure min/max are numbers.
                const sliderMin = parseFloat(sumInsuredSlider.min) || 0;
                sumInsuredSlider.value = sliderMin;
                sumInsuredSlider.disabled = true;
            }
            if (sumInsuredMinLabel) sumInsuredMinLabel.textContent = '--';
            if (sumInsuredMaxLabel) sumInsuredMaxLabel.textContent = '--';
            if (sumInsuredRangeText) sumInsuredRangeText.textContent = 'Range: N/A';
            if (sumInsuredRangeDescription) sumInsuredRangeDescription.textContent = 'Vehicle details needed to determine range.';
            if (sumInsuredTextInputError) sumInsuredTextInputError.classList.add('hidden');
            if (sumInsuredErrorDisplay) sumInsuredErrorDisplay.classList.add('hidden');
            if (sumInsuredContainer) sumInsuredContainer.classList.add('opacity-50', 'pointer-events-none');

            // console.log(`Reset sumInsuredTextInput to placeholder: "${placeholderText}", disabled: ${disable}`);
            return;
        }

        let choicesInstance = null;
        if (elementOrInstance instanceof Choices) { // It's already a Choices instance
            choicesInstance = elementOrInstance;
        } else if (elementOrInstance instanceof HTMLElement && window.choicesInstances) { // It's an HTMLElement
            choicesInstance = window.choicesInstances[elementOrInstance.id];
            if (!choicesInstance && elementOrInstance.id && window.choicesInstances[elementOrInstance.id + 'Select']){
                // Handling cases where ID in choicesInstances might have "Select" appended
                choicesInstance = window.choicesInstances[elementOrInstance.id + 'Select'];
            }
        }

        if (choicesInstance && typeof choicesInstance.clearStore === 'function') {
            choicesInstance.clearStore();
            choicesInstance.setChoices(
                [{ value: '', label: placeholderText, placeholder: true, selected: true, disabled: false }],
                'value', 'label', true
            );
            if (disable) {
                choicesInstance.disable();
            } else {
                choicesInstance.enable();
            }
            // console.log(`Reset Choices instance (ID: ${elementOrInstance.id || 'N/A'}) to placeholder: "${placeholderText}", disabled: ${disable}`);
        } else {
            // Fallback for native select or if Choices instance not found
            if (elementOrInstance instanceof HTMLSelectElement) {
                elementOrInstance.innerHTML = `<option value="" selected disabled>${placeholderText}</option>`;
                elementOrInstance.disabled = disable;
                console.warn(`resetDropdown: Used fallback for native select (ID: ${elementOrInstance.id}). Placeholder: "${placeholderText}", disabled: ${disable}`);
            } else {
                console.error('resetDropdown: Could not find or operate on Choices instance for:', elementOrInstance, 'Available instances:', window.choicesInstances);
            }
        }
    }

    // --- Step Navigation Functions ---
    function goToStep(step) {
        if (step === 1) {
            step1Section.classList.add('active');
            step2Section.classList.remove('active');
            progressBar.style.width = '0%';
            progressText.textContent = 'Step 1 of 2: Owner Details';
            return true; // Successfully moved to step 1
        } else if (step === 2) {
            if (!validateStep1()) { // validateStep1() already shows modals on failure
                return false; // Validation failed, did not move to step 2
            }
            // If validation passed:
            step1Section.classList.remove('active');
            step2Section.classList.add('active');
            progressBar.style.width = '50%';
            progressText.textContent = 'Step 2 of 2: Vehicle Details';
            return true; // Successfully moved to step 2
        }
        return false; // Default for unhandled steps or if logic dictates failure
    }

    function validateStep1() {
        let isValid = true;
        
        if (!ownerNameInput.value.trim()) {
            isValid = false;
            document.getElementById('ownerNameInputError').classList.remove('hidden');
        } else {
            document.getElementById('ownerNameInputError').classList.add('hidden');
        }
        
        const nationalityValue = nationalityChoicesInstance ? nationalityChoicesInstance.getValue(true) : null;
        if (!nationalityValue) {
            isValid = false;
            document.getElementById('nationalitySelectError').classList.remove('hidden');
        } else {
            document.getElementById('nationalitySelectError').classList.add('hidden');
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!ownerEmailInput.value.trim() || !emailRegex.test(ownerEmailInput.value)) {
            isValid = false;
            document.getElementById('ownerEmailInputError').classList.remove('hidden');
        } else {
            document.getElementById('ownerEmailInputError').classList.add('hidden');
        }
        
        const mobileRegex = /^\d{8,}$/; // Assuming UAE mobile numbers, adjust if needed
        if (!ownerMobileInput.value.trim() || !mobileRegex.test(ownerMobileInput.value.replace(/\D/g, ''))) {
            isValid = false;
            document.getElementById('ownerMobileInputError').classList.remove('hidden');
        } else {
            document.getElementById('ownerMobileInputError').classList.add('hidden');
        }
        
        if (!ownerDobInput.value) {
            isValid = false;
            document.getElementById('ownerDobInputError').classList.remove('hidden');
        } else {
            document.getElementById('ownerDobInputError').classList.add('hidden');
        }
        
        if (!licenseIssueDateInput.value) {
            isValid = false;
            document.getElementById('licenseIssueDateInputError').classList.remove('hidden');
        } else {
            document.getElementById('licenseIssueDateInputError').classList.add('hidden');
        }
        
        const driverAge = calculateAndDisplayAge();
        if (driverAge === null || driverAge < 18) {
            isValid = false;
            // calculateAndDisplayAge might not show a modal for < 18, so ensure one is shown here if validating.
            // However, validateStep1 is often called by goToStep which might show its own modal if this returns false.
            // For direct calls to validateStep1, ensure modal is shown.
            // The original logic in goToStep(2) already calls showModal if driverAge < 18.
            // So, just setting isValid = false is enough here if called from there.
            // If called independently, a modal might be needed here. For now, assuming it's mainly for goToStep.
            if (!document.getElementById('ownerDobInputError').classList.contains('hidden')) {
                 // If DOB error is already visible (e.g. empty), don't overwrite with age specific one here,
                 // as goToStep(2) will handle the age specific modal.
            } else {
                showModal("Owner must be at least 18 years old.");
            }
        }
        
        return isValid;
    }

    // --- API Functions ---
    async function fetchData(url, method = 'get', data = null, headers = {}) {
        console.log(`Calling: ${method.toUpperCase()} ${url}`);
        let response;
        let responseBody; 

        try {
            headers['Content-Type'] = 'application/json';
            if (jwtToken) {
                headers['Authorization'] = `Bearer ${jwtToken}`;
            }

            const config = {
                method: method.toUpperCase(),
                headers: headers
            };
            
            let fetchUrl = url;
            if (method.toLowerCase() === 'get' && data) {
                const params = new URLSearchParams(data);
                fetchUrl = `${url}?${params}`;
            } else if (data && (method.toLowerCase() === 'post' || method.toLowerCase() === 'put')) { // ensure data is stringified for relevant methods
                config.body = JSON.stringify(data);
            }

            response = await fetch(fetchUrl, config);
            
            responseBody = await response.text(); 

            const contentType = response.headers.get("content-type");
            let parsedData = responseBody; 
            if (contentType && contentType.indexOf("application/json") !== -1 && responseBody) {
                try {
                    parsedData = JSON.parse(responseBody);
                } catch (jsonParseError) {
                    console.warn("Failed to parse response body as JSON, treating as plain text:", jsonParseError, "\nResponse Body:", responseBody);
                }
            }

            if (!response.ok) {
                const error = new Error(`HTTP error! status: ${response.status}`);
                error.response = { status: response.status, data: parsedData }; 
                throw error;
            }
            
            return parsedData; 
        } catch (err) {
            console.error(`API Error calling ${url}:`, err);
            let errorMsg = `API request failed for ${url}:`;
            if (err.response) { 
                errorMsg = `API Error (${err.response.status})`;
                // Try to get a meaningful message from the parsed data if available
                const detail = err.response.data?.error?.message || // Common error structures
                               err.response.data?.error ||
                               err.response.data?.message ||
                               (typeof err.response.data === 'string' ? err.response.data : null);
                
                if (detail && detail.length < 200) { // Prefer shorter, specific messages
                    errorMsg += `: ${detail}`;
                } else if (err.response.data && typeof err.response.data === 'object') { // If object but no clear message
                    errorMsg += ` (Response: ${JSON.stringify(Object.keys(err.response.data))}. Check console for full details)`;
                } else if (typeof err.response.data === 'string' && err.response.data.length > 200) { // Long string response
                     errorMsg += ` (Response too long. Check console for full details)`;
                }
                 else { // Fallback to status
                    errorMsg += ` (Status ${err.response.status})`;
                }
                console.error('Full API error response data:', err.response.data); // Log full data for debugging
            } else if (err.request) { 
                errorMsg = `Network Error: No response received from server for ${url}. Please check connection.`;
            } else {
                errorMsg = `Error: ${err.message}`; // Includes "Failed to fetch" etc.
            }
            throw new Error(errorMsg); // Re-throw with a more informative message
        }
    }

    async function fetchApiConfigAndToken() {
        try {
            console.log('Fetching API token from /api/init');
            const data = await fetchData('/api/init', 'get');
            jwtToken = data?.token || ''; 
            if (!jwtToken) {
                throw new Error('Authentication token was not received from server.');
            }
            tokenDisplayDiv.textContent = 'Token Status: Received';
            console.log("Token acquired.");
        } catch (err) {
            console.error('CRITICAL: Error during fetch to /api/init:', err);
            window.location.href = 'error.html';
            // throw new Error("Redirecting due to token fetch failure."); // Unreachable due to redirect
        }
    }
    // --- Dropdown Population Functions ---

async function populateApiDropdown(selectElementOrInstance, apiUrl, apiMethod, apiParams, choicesInstanceFromCaller, placeholderText, resetFurtherDependentsFn = null) { 
    let actualChoicesInstance = choicesInstanceFromCaller;

    if (selectElementOrInstance instanceof HTMLElement && !actualChoicesInstance && window.choicesInstances) {
        actualChoicesInstance = window.choicesInstances[selectElementOrInstance.id];
        if (!actualChoicesInstance && selectElementOrInstance.id && window.choicesInstances[selectElementOrInstance.id + 'Select']){
            actualChoicesInstance = window.choicesInstances[selectElementOrInstance.id + 'Select'];
        }
    }

    if (!actualChoicesInstance || typeof actualChoicesInstance.clearStore !== 'function') {
        console.error(`populateApiDropdown: Invalid or missing Choices.js instance for element:`, selectElementOrInstance);
        if (selectElementOrInstance instanceof HTMLSelectElement) { 
            selectElementOrInstance.innerHTML = `<option value="" selected disabled>Error: Config issue</option>`;
            selectElementOrInstance.disabled = true;
        }
        return;
    }

    if (typeof resetDropdown !== 'function') { 
        console.error("populateApiDropdown relies on resetDropdown, which is not defined!");
        actualChoicesInstance.clearStore();
        actualChoicesInstance.setChoices(
            [{ value: '', label: `Error: Dep Missing`, placeholder: true, selected: true, disabled: false }],
            'value', 'label', true
        );
        actualChoicesInstance.disable();
        return;
    }

    const loadingPlaceholder = placeholderText.startsWith('Select') ? `Loading ${placeholderText.substring(7).toLowerCase()}...` : `Loading...`;
    resetDropdown(actualChoicesInstance, loadingPlaceholder, true);

    if (resetFurtherDependentsFn && typeof resetFurtherDependentsFn === 'function') {
        resetFurtherDependentsFn();
    }

    try {
        const resp = await fetchData(apiUrl, apiMethod, apiParams); 
        const list = resp?.LookupList || []; 

        const choicesOptions = list
            .filter(item => item && typeof item.Name === 'string' && item.Name.trim() !== '')
            .map(item => ({
                value: item.Name.trim(), 
                label: item.Name.trim()  
            }));

        actualChoicesInstance.clearStore(); 
        if (choicesOptions.length > 0) {
            actualChoicesInstance.setChoices(
                [{ value: '', label: placeholderText, placeholder: true, selected: true, disabled: false }, ...choicesOptions],
                'value', 'label', true
            );
            actualChoicesInstance.enable();
        } else {
            const noDataPlaceholder = placeholderText.startsWith('Select') ? `No ${placeholderText.substring(7).toLowerCase()} found` : `No data found`;
            actualChoicesInstance.setChoices(
                [{ value: '', label: noDataPlaceholder, placeholder: true, selected: true, disabled: false }],
                'value', 'label', true
            );
            actualChoicesInstance.disable();
        }
    } catch (err) {
        console.error(`Error fetching data for ${placeholderText} from ${apiUrl} (Method: ${apiMethod.toUpperCase()}):`, err);
        const errorPlaceholder = placeholderText.startsWith('Select') ? `Error loading ${placeholderText.substring(7).toLowerCase()}` : `Error loading data`;
        actualChoicesInstance.clearStore(); 
        actualChoicesInstance.setChoices(
            [{ value: '', label: errorPlaceholder, placeholder: true, selected: true, disabled: false }],
            'value', 'label', true
        );
        actualChoicesInstance.disable();
    }
}

    function populateModelYears() {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = 0; i < 30; i++) {
            const year = currentYear - i;
            years.push({ value: String(year), label: String(year) });
        }
        
        if (modelYearChoicesInstance) {
            modelYearChoicesInstance.setChoices([{ value: '', label: 'Select Model Year', placeholder: true, selected: true, disabled: false }, ...years], 'value', 'label', true);
            modelYearChoicesInstance.enable();
        } else {
            console.error("Model Year Choices instance not found.");
        }
    }

    function populateMakeDropdown() {
        const makes = ["TOYOTA", "NISSAN", "MITSUBISHI", "LEXUS", "KIA", "HYUNDAI", "HONDA", "FORD", "CHEVROLET", "AUDI", "BMW", "ACURA", "ALFA ROMEO", "ASHOK LEYLAND", "ASTON MARTIN", "BAIC", "BENTLEY", "BESTUNE", "BORGWARD", "BRILLANCE", "BUGATTI", "BUICK", "BYO", "CADILLAC", "CATERHAM", "CATERPILLAR", "CHANGAN", "CHERY", "CHRYSLER", "CITROEN", "CMC", "DAEWOO", "DAIHATSU", "DODGE", "FERRARI", "FIAT", "FISKER", "FOTON", "GAC", "GEELY", "GMC", "GONOW", "GREAT WALL", "HAVAL", "HONGQI", "HUMMER", "INFINITI", "ISUZU", "ITALDESIGN", "JAC", "JAGUAR", "JEEP", "L'ETOUR", "JMC", "KING LONG", "KOENIGSEGG", "LAMBORGHINI", "LAND ROVER", "LINCOLN", "LOTUS", "LUXGEN", "MAHINDRA", "MASERATI", "MAXUS", "MAYBACH", "MAZDA", "McLAREN", "MERCEDES BENZ", "MERCURY", "MG", "MINI", "MORGAN", "OPEL", "OTOKAR", "PAGANI", "PEUGEOT", "PGO", "PONTIAC", "PORSCHE", "PROTON", "RENAULT", "ROLLS ROYCE", "ROVER", "SAAB", "SANDSTORM", "SATURN", "SCION", "SEAT", "SKODA", "SMART", "SSANGYONG", "SUBARU", "SUZUKI", "TATA", "TESLA", "VICTORY", "VOLKSWAGEN", "VOLVO", "VUTONG", "ZNA", "ZOTYE"];
        
        const choicesOptions = makes.map(make => ({ value: make, label: make }));
        
        if (makeChoicesInstance) {
            makeChoicesInstance.clearStore();
            makeChoicesInstance.setChoices([{ value: '', label: 'Select Make', placeholder: true, selected: true, disabled: false }, ...choicesOptions], 'value', 'label', true);
            makeChoicesInstance.enable(); 
        } else {
            console.error("Make select element not found or Choices instance not initialized.");
        }
    }

    function populateNationalityDropdown() {
        const countries = ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo (Congo-Brazzaville)", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czechia (Czech Republic)", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini (fmr. Swaziland)", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar (formerly Burma)", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine State", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States of America", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe", "Other"];
        countries.sort();
        
        const choicesOptions = countries.map(c => ({ value: c, label: c }));
        
        if (nationalityChoicesInstance) {
            nationalityChoicesInstance.clearStore();
            nationalityChoicesInstance.setChoices([{ value: '', label: 'Select Nationality', placeholder: true, selected: true, disabled: false }, ...choicesOptions], 'value', 'label', true);
            nationalityChoicesInstance.enable();
        } else {
            console.error("Nationality select element not found or Choices instance not initialized.");
        }
    }

    async function populateModelDropdown() {
        console.log("Populate Model triggered");
    
        if (typeof resetDropdown !== 'function') { 
            console.error("resetDropdown function is not defined! This should not happen if script is updated.");
            return;
        }
        
        resetDropdown(modelSelect, 'Loading Models...', true); 
        resetDropdown(trimSelect, 'Select Model first');
        resetDropdown(bodyTypeSelect, 'Select Trim first');
        resetDropdown(engineSizeSelect, 'Select Body Type first');
        resetDropdown(doorsSelect, 'Select Body Type first');
        resetDropdown(transmissionSelect, 'Select Engine Size first');
        resetDropdown(cylinderSelect, 'Select Engine Size first');
        resetDropdown(sumInsuredTextInput, '---'); 

        const yearValue = modelYearChoicesInstance.getValue(true);
        const makeValue = makeChoicesInstance.getValue(true);
        
        if (!yearValue || !makeValue) {
            resetDropdown(modelSelect, !yearValue ? 'Select Year first' : 'Select Make first', true);
            return;
        }

        try {
            const params = { ModelYear: yearValue, Make: makeValue, vehicleType: 'Private' }; // Ensure these param names are correct for GET
            const resp = await fetchData('/api/motor/getmodel', 'get', params);
            const list = resp?.LookupList || [];

            const choicesOptions = list
                .filter(m => m && typeof m.Name === 'string' && m.Name.trim() !== '')
                .map(m => ({
                    value: m.Name.trim(),
                    label: m.Name.trim()
                }));

            modelChoicesInstance.clearStore();
            if (choicesOptions.length > 0) {
                modelChoicesInstance.setChoices([
                    { value: '', label: 'Select Model', placeholder: true, selected: true, disabled: false },
                    ...choicesOptions
                ], 'value', 'label', true);
                modelChoicesInstance.enable();
            } else {
                modelChoicesInstance.setChoices([
                    { value: '', label: 'No models found', placeholder: true, selected: true, disabled: false }
                ], 'value', 'label', true);
                modelChoicesInstance.disable();
            }
        } catch (err) {
            console.error("Error fetching models:", err);
            modelChoicesInstance.setChoices([
                { value: '', label: 'Error loading models', placeholder: true, selected: true, disabled: false }
            ], 'value', 'label', true);
            modelChoicesInstance.disable();
        }
    }


    async function populateTrimDropdown() {
        console.log("Populate Trim triggered");
        resetDropdown(trimSelect, 'Loading Trims...', true);
        resetDropdown(bodyTypeSelect, 'Select Trim first');
        resetDropdown(engineSizeSelect, 'Select Body Type first');
        resetDropdown(doorsSelect, 'Select Body Type first');
        resetDropdown(transmissionSelect, 'Select Engine Size first');
        resetDropdown(cylinderSelect, 'Select Engine Size first');
        resetDropdown(sumInsuredTextInput, '---');

        const yearValue = modelYearChoicesInstance.getValue(true);
        const makeValue = makeChoicesInstance.getValue(true);
        const modelValue = modelChoicesInstance.getValue(true);

        if (!yearValue || !makeValue || !modelValue) {
            resetDropdown(trimSelect, 'Select Model first', true);
            console.log("Prerequisites missing for Trim fetch.");
            return;
        }

        try {
            const params = { ModelYear: yearValue, Make: makeValue, Model: modelValue, vehicleType: 'Private' }; // Ensure these param names are correct for GET
            const resp = await fetchData('/api/motor/gettrim', 'get', params);
            const list = resp?.LookupList || [];

            if (trimChoicesInstance) {
                const choicesOptions = list
                    .filter(t => t && typeof t.Name === 'string')
                    .map(t => ({ value: t.Name.trim(), label: t.Name.trim() }));

                trimChoicesInstance.clearStore();
                if (choicesOptions.length > 0) {
                    trimChoicesInstance.setChoices([
                        { value: '', label: 'Select Trim', placeholder: true, selected: true, disabled: false },
                        ...choicesOptions
                    ], 'value', 'label', true);
                    trimChoicesInstance.enable();
                } else {
                    trimChoicesInstance.setChoices([
                        { value: '', label: 'No trims found', placeholder: true, selected: true, disabled: false }
                    ], 'value', 'label', true);
                    trimChoicesInstance.disable();
                }
            }
        } catch (err) {
            console.error("Error fetching or processing trims:", err);
            if (trimChoicesInstance) {
                trimChoicesInstance.clearStore();
                trimChoicesInstance.setChoices([
                    { value: '', label: 'Error fetching trims', placeholder: true, selected: true, disabled: false }
                ], 'value', 'label', true);
                trimChoicesInstance.disable();
            }
        }
    }

    async function populateBodyTypeDropdown() {
        console.log("Populate Body Type triggered");
        resetDropdown(bodyTypeSelect, 'Loading Body Types...', true);
        resetDropdown(engineSizeSelect, 'Select Body Type first');
        resetDropdown(doorsSelect, 'Select Body Type first');
        resetDropdown(transmissionSelect, 'Select Engine Size first');
        resetDropdown(cylinderSelect, 'Select Engine Size first');
        resetDropdown(sumInsuredTextInput, '---');

        const yearValue = modelYearChoicesInstance.getValue(true);
        const makeValue = makeChoicesInstance.getValue(true);
        const modelValue = modelChoicesInstance.getValue(true);
        const trimValue = trimChoicesInstance.getValue(true);

        if (!yearValue || !makeValue || !modelValue || !trimValue) {
            resetDropdown(bodyTypeSelect, 'Select Trim first', true);
            console.log("Prerequisites missing for Body Type fetch.");
            return;
        }

        try {
            const params = { ModelYear: yearValue, Make: makeValue, Model: modelValue, Trim: trimValue, vehicleType: 'Private' }; // Ensure these param names are correct for GET
            const resp = await fetchData('/api/motor/getbody', 'get', params);
            const list = resp?.LookupList || [];

            if (bodyTypeChoicesInstance) {
                const choicesOptions = list
                    .filter(bt => bt && typeof bt.Name === 'string')
                    .map(bt => ({ value: bt.Name.trim(), label: bt.Name.trim() }));

                bodyTypeChoicesInstance.clearStore();
                if (choicesOptions.length > 0) {
                    bodyTypeChoicesInstance.setChoices([
                        { value: '', label: 'Select Body Type', placeholder: true, selected: true, disabled: false },
                        ...choicesOptions
                    ], 'value', 'label', true);
                    bodyTypeChoicesInstance.enable();
                } else {
                    bodyTypeChoicesInstance.setChoices([
                        { value: '', label: 'No body types found', placeholder: true, selected: true, disabled: false }
                    ], 'value', 'label', true);
                    bodyTypeChoicesInstance.disable();
                }
            }
        } catch (err) {
            console.error("Error fetching or processing body types:", err);
            if (bodyTypeChoicesInstance) {
                bodyTypeChoicesInstance.clearStore();
                bodyTypeChoicesInstance.setChoices([
                    { value: '', label: 'Error fetching body types', placeholder: true, selected: true, disabled: false }
                ], 'value', 'label', true);
                bodyTypeChoicesInstance.disable();
            }
        }
    } 

    async function populateEngineSizeDropdown() {
        resetDropdown(transmissionSelect, 'Select Engine Size first');
        resetDropdown(cylinderSelect, 'Select Engine Size first');
        resetDropdown(sumInsuredTextInput, '---');

        const yearValue = modelYearChoicesInstance.getValue(true);
        const makeValue = makeChoicesInstance.getValue(true);
        const modelValue = modelChoicesInstance.getValue(true);
        const trimValue = trimChoicesInstance.getValue(true);
        const bodyTypeValue = bodyTypeChoicesInstance.getValue(true);
        if (!yearValue || !makeValue || !modelValue || !trimValue || !bodyTypeValue) {
            resetDropdown(engineSizeSelect, 'Select Body Type first', true);
            return;
        }
        const params = { ModelYear: yearValue, Make: makeValue, Model: modelValue, Trim: trimValue, BodyType: bodyTypeValue, vehicleType: 'Private' };
        await populateApiDropdown(engineSizeSelect, '/api/motor/getenginesize', 'get', params, engineSizeChoicesInstance, 'Select Engine Size');
    }

    async function populateDoorsDropdown() {
        const yearValue = modelYearChoicesInstance.getValue(true);
        const makeValue = makeChoicesInstance.getValue(true);
        const modelValue = modelChoicesInstance.getValue(true);
        const trimValue = trimChoicesInstance.getValue(true);
        const bodyTypeValue = bodyTypeChoicesInstance.getValue(true);
        if (!yearValue || !makeValue || !modelValue || !trimValue || !bodyTypeValue) {
            resetDropdown(doorsSelect, 'Select Body Type first', true);
            return;
        }
        const params = { ModelYear: yearValue, Make: makeValue, Model: modelValue, Trim: trimValue, BodyType: bodyTypeValue, vehicleType: 'Private' };
        await populateApiDropdown(doorsSelect, '/api/motor/getdoor', 'get', params, doorsChoicesInstance, 'Select Number of Doors');
    }


    async function populateTransmissionDropdown() {
        resetDropdown(sumInsuredTextInput, '---');

        const yearValue = modelYearChoicesInstance.getValue(true);
        const makeValue = makeChoicesInstance.getValue(true);
        const modelValue = modelChoicesInstance.getValue(true);
        const trimValue = trimChoicesInstance.getValue(true);
        const bodyTypeValue = bodyTypeChoicesInstance.getValue(true);
        const engineSizeValue = engineSizeChoicesInstance.getValue(true);

        if (!yearValue || !makeValue || !modelValue || !trimValue || !bodyTypeValue || !engineSizeValue) {
            resetDropdown(transmissionSelect, 'Select Engine Size first', true);
            return;
        }
        const transmissionPayload = {
            modelYear: yearValue, // camelCase for POST
            make: makeValue,
            model: modelValue,
            trim: trimValue,
            bodyType: bodyTypeValue, 
            engineSize: engineSizeValue,
            vehicleType: 'Private' 
        };
        await populateApiDropdown(transmissionSelect, '/api/motor/gettransmission', 'post', transmissionPayload, transmissionChoicesInstance, 'Select Transmission');
    }

    async function populateCylinderDropdown() {
        const yearValue = modelYearChoicesInstance.getValue(true);
        const makeValue = makeChoicesInstance.getValue(true);
        const modelValue = modelChoicesInstance.getValue(true);
        const trimValue = trimChoicesInstance.getValue(true);
        const engineSizeValue = engineSizeChoicesInstance.getValue(true);

        if (!yearValue || !makeValue || !modelValue || !trimValue || !engineSizeValue) {
            resetDropdown(cylinderSelect, 'Select Engine Size first', true);
            return;
        }
        const cylinderPayload = {
            modelYear: yearValue, // camelCase for POST
            make: makeValue,
            model: modelValue,
            trim: trimValue,
            engineSize: engineSizeValue,
            vehicleType: 'Private' 
        };
        await populateApiDropdown(cylinderSelect, '/api/motor/getcylinders', 'post', cylinderPayload, cylinderChoicesInstance, 'Select Cylinders');
    }
    
    function populateCityDropdown() {
        const cities = ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"];
        const choicesOptions = cities.map(city => ({ value: city, label: city }));
        if (cityChoicesInstance) {
            cityChoicesInstance.clearStore();
            cityChoicesInstance.setChoices([{ value: '', label: 'Select City', placeholder: true, selected: true, disabled: false }, ...choicesOptions], 'value', 'label', true);
            cityChoicesInstance.enable();
        } else {
            console.error("City Choices instance not found.");
        }
    }

    function populateNCDDropdown() {
        const ncdYears = ["0", "1", "2", "3", "4", "5+"]; 
        const choicesOptions = ncdYears.map(year => ({ value: year, label: `${year} Year${year === "1" ? "" : "s"}` })); // Improved label
        if (ncdChoicesInstance) {
            ncdChoicesInstance.clearStore();
            ncdChoicesInstance.setChoices([{ value: '', label: 'Select NCD Years', placeholder: true, selected: true, disabled: false }, ...choicesOptions], 'value', 'label', true);
            ncdChoicesInstance.enable();
        } else {
            console.error("NCD Choices instance not found.");
        }
    }

    async function fetchAndDisplayVehicleValue() {  
        console.log("Fetch Vehicle Value triggered");  
        resetDropdown(sumInsuredTextInput, 'Calculating...');  
        vehicleLowValue = null; vehicleHighValue = null; vehicleMediumValue = null;  

        const yearValue = modelYearChoicesInstance.getValue(true);  
        const makeValue = makeChoicesInstance.getValue(true);  
        const modelValue = modelChoicesInstance.getValue(true);  
        const trimValue = trimChoicesInstance.getValue(true);  
        const bodyTypeValue = bodyTypeChoicesInstance.getValue(true);  
        const engineSizeValue = engineSizeChoicesInstance.getValue(true);  
        const transmissionValue = transmissionChoicesInstance.getValue(true);  

        if (!yearValue || !makeValue || !modelValue || !trimValue || !bodyTypeValue || !engineSizeValue || !transmissionValue) {  
            console.log("Vehicle value prerequisites not met. Required: Year, Make, Model, Trim, BodyType, EngineSize, Transmission.");  
            resetDropdown(sumInsuredTextInput, '---'); 
            return;  
        }  

        try {  
            // Ensure payload keys match what /api/motor/getvehiclevalue (POST) expects. Assuming camelCase from other POSTs.
            const valuePayload = {  
                customerType: "Individual", 
                region: "GCC", 
                modelYear: yearValue, 
                make: makeValue,  
                model: modelValue, 
                trim: trimValue, 
                engineSize: engineSizeValue, 
                bodyType: bodyTypeValue,  
                transmission: transmissionValue, 
                vehicleType: "Private", 
                vin: "", 
                mileage: "0", // API might expect number or string
                callerCode: "TestCallerCode", // Or derive from JWT/config
                tplOnly: "No", 
                vehicleCondition: "null", // Or actual condition if available
                countryCode: "null",    // Or actual country code
                transactionPurpose: "New", 
                isNewVehicle: "0",       // Or derive if possible
                requestId: `TestRef_${Date.now()}`, 
                colour: "null"           // Or actual color
            };  
            console.log("Sending Vehicle Value Payload:", valuePayload);  
            const resp = await fetchData('/api/motor/getvehiclevalue', 'post', valuePayload);  
            console.log("Vehicle Value API raw response:", resp);  

            const valuation = resp?.Valuation;  
            // Ensure Low, High, Medium are numbers before using them
            const low = parseFloat(valuation?.Low);  
            const high = parseFloat(valuation?.High);  
            const medium = parseFloat(valuation?.Medium);  

            if (!isNaN(low) && !isNaN(high) && !isNaN(medium) && low <= medium && medium <= high) {  
                vehicleLowValue = low;  
                vehicleHighValue = high;  
                vehicleMediumValue = medium;  

                const lowFormatted = formatCurrency(low);  
                const highFormatted = formatCurrency(high);  
                const mediumFormatted = formatCurrency(medium);  

                sumInsuredTextInput.min = String(low);  
                sumInsuredTextInput.max = String(high);  
                sumInsuredTextInput.value = String(medium); 
                sumInsuredTextInput.disabled = false;  
                sumInsuredTextInput.placeholder = `e.g. ${mediumFormatted}`;  
                sumInsuredRangeText.textContent = `Range: ${lowFormatted} - ${highFormatted}`;  
                sumInsuredRangeDescription.textContent = `Value must be between AED ${lowFormatted} and ${highFormatted}.`;  
                sumInsuredTextInputError.classList.add('hidden'); 

                sumInsuredSlider.min = String(low);  
                sumInsuredSlider.max = String(high);  
                sumInsuredSlider.value = String(medium); 
                sumInsuredSlider.step = String(Math.max(100, Math.round((high - low) / 100 || 100)));  
                sumInsuredSlider.disabled = (low === high); 

                sumInsuredMinLabel.textContent = lowFormatted;  
                sumInsuredMaxLabel.textContent = highFormatted;  

                sumInsuredContainer.classList.remove('opacity-50', 'pointer-events-none');  
                sumInsuredErrorDisplay.classList.add('hidden');  

            } else {  
                console.warn("Valuation data missing, invalid, or inconsistent in API response:", resp);  
                resetDropdown(sumInsuredTextInput, 'Not Available'); 
                sumInsuredErrorDisplay.textContent = resp?.Valuation?.Message || 'Value Not Available'; // Use API message if present
                sumInsuredErrorDisplay.classList.remove('hidden');  
                sumInsuredRangeDescription.textContent = 'Could not determine vehicle value range.';  
                sumInsuredRangeText.textContent = 'Range: N/A';  
                vehicleLowValue = null; vehicleHighValue = null; vehicleMediumValue = null;  
            }  
        } catch (err) {  
            console.error("Error fetching vehicle value:", err);  
            resetDropdown(sumInsuredTextInput, 'Error'); 
            sumInsuredErrorDisplay.textContent = 'Error fetching value';  
            sumInsuredErrorDisplay.classList.remove('hidden');  
            sumInsuredRangeDescription.textContent = 'Error retrieving vehicle value range.';  
            sumInsuredRangeText.textContent = 'Range: Error';  
            vehicleLowValue = null; vehicleHighValue = null; vehicleMediumValue = null;  
        }  
    }  

    function calculateAndDisplayAge() {  
        const dobString = ownerDobInput.value;  
        if (!dobString) { driverAgeDisplay.textContent = '---'; return null; }  
        try {  
            const dob = new Date(dobString + 'T00:00:00Z'); 
            if (isNaN(dob.getTime())) { driverAgeDisplay.textContent = 'Invalid Date'; return null; }  
            const today = new Date();  
            let age = today.getUTCFullYear() - dob.getUTCFullYear();  
            const monthDiff = today.getUTCMonth() - dob.getUTCMonth();  
            const dayDiff = today.getUTCDate() - dob.getUTCDate();  
            if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) { age--; }  
            if (age >= 0) { driverAgeDisplay.textContent = `${age} years`; return age; }  
            else { driverAgeDisplay.textContent = 'Future Date'; return null; } // More specific than "Invalid Date" if age < 0
        } catch (e) { console.error("Error calculating age:", e); driverAgeDisplay.textContent = 'Error'; return null; }  
    }  

    function showModal(message) {  
        errorMessageText.textContent = message || 'An unexpected error occurred.';  
        errorModal.classList.remove('hidden');  
        requestAnimationFrame(() => {  
            errorModal.classList.add('opacity-100');  
            errorModalContent.classList.add('scale-100','opacity-100');  
            errorModalContent.classList.remove('scale-95','opacity-0');  
        });  
    }  
    function hideModal() {  
        errorModalContent.classList.remove('scale-100','opacity-100');  
        errorModalContent.classList.add('scale-95','opacity-0');  
        errorModal.classList.remove('opacity-100');  
        setTimeout(() => { errorModal.classList.add('hidden'); }, 300);  
    }  

    // --- Email Notification Functions ---  
    async function sendQuoteEmailNotification(quoteData) {  
        const emailEndpoint = '/api/send-quote-notification';  
        console.log(`Sending quote notification email via: ${emailEndpoint}`);  
        try {  
            const emailPayload = {  
                quoteReference: quoteData.quoteNo || `Ref_${Date.now()}`, 
                fullName: quoteData.fullName,  
                emailAddress: quoteData.emailAddress,  
                mobileNo: quoteData.mobileNo,  
                make: quoteData.make,  
                model: quoteData.model,  
                modelYear: quoteData.modelYear,  
                sumInsured: quoteData.sumInsured,
                premium: quoteData.premium, 
                insurerName: quoteData.insurerName, 
                planName: quoteData.planName 
            };  
            const response = await fetchData(emailEndpoint, 'post', emailPayload);  
            console.log('Quote notification email API response:', response);  
            return true;  
        } catch (error) { console.error('Error sending quote notification email:', error); return false; }  
    }

    async function sendOwnerDetailsEmailNotification(ownerDataForEmail) {
        const emailEndpoint = '/api/send-owner-details-notification'; // YOU NEED TO CREATE THIS BACKEND ENDPOINT
        console.log(`Sending owner details (Step 1 completion) email via: ${emailEndpoint}`);
        try {
            // The backend API at emailEndpoint will receive this payload
            // and be responsible for sending the email to the appropriate recipients (e.g., an admin team).
            const response = await fetchData(emailEndpoint, 'post', ownerDataForEmail);
            console.log('Owner details (Step 1 completion) email API response:', response);
            return true;
        } catch (error) {
            console.error('Error sending owner details (Step 1 completion) email:', error);
            // Log the error, but this likely shouldn't block the user flow.
            return false;
        }
    }

    // --- Event Listeners ---
    document.addEventListener('DOMContentLoaded', async () => {
        window.choicesInstances = window.choicesInstances || {};

        try {
            await fetchApiConfigAndToken();
            
            modelYearChoicesInstance = new Choices(modelYearSelect, {
                searchEnabled: true, itemSelectText: "", removeItemButton: false,
                placeholderValue: 'Select Model Year', searchPlaceholderValue: 'Search...',
                shouldSort: false, allowHTML: false
            });
            window.choicesInstances['modelYear'] = modelYearChoicesInstance;
            populateModelYears(); 

            makeChoicesInstance = new Choices(makeSelect, {
                searchEnabled: true, itemSelectText: "", removeItemButton: false,
                placeholderValue: 'Select Make', searchPlaceholderValue: 'Search...',
                shouldSort: false, allowHTML: false
            });
            window.choicesInstances['make'] = makeChoicesInstance;
            populateMakeDropdown(); 

            modelChoicesInstance = new Choices(modelSelect, {
                searchEnabled: true, itemSelectText: "", removeItemButton: false,
                placeholderValue: 'Select Make/Year first', searchPlaceholderValue: 'Search...',
                shouldSort: false, allowHTML: false
            });
            window.choicesInstances['model'] = modelChoicesInstance;
            resetDropdown(modelChoicesInstance, 'Select Make/Year first'); // Use resetDropdown for initial state

            trimChoicesInstance = new Choices(trimSelect, {
                searchEnabled: true, itemSelectText: "", removeItemButton: false,
                placeholderValue: 'Select Model first', searchPlaceholderValue: 'Search...',
                shouldSort: false, allowHTML: false
            });
            window.choicesInstances['trim'] = trimChoicesInstance;
            resetDropdown(trimChoicesInstance, 'Select Model first');

            bodyTypeChoicesInstance = new Choices(bodyTypeSelect, {
                searchEnabled: true, itemSelectText: "", removeItemButton: false,
                placeholderValue: 'Select Trim first', searchPlaceholderValue: 'Search...',
                shouldSort: false, allowHTML: false
            });
            window.choicesInstances['bodyType'] = bodyTypeChoicesInstance;
            resetDropdown(bodyTypeChoicesInstance, 'Select Trim first');

            engineSizeChoicesInstance = new Choices(engineSizeSelect, {
                searchEnabled: true, itemSelectText: "", removeItemButton: false,
                placeholderValue: 'Select Body Type first', searchPlaceholderValue: 'Search...',
                shouldSort: false, allowHTML: false
            });
            window.choicesInstances['engineSize'] = engineSizeChoicesInstance;
            resetDropdown(engineSizeChoicesInstance, 'Select Body Type first');

            doorsChoicesInstance = new Choices(doorsSelect, {
                searchEnabled: true, itemSelectText: "", removeItemButton: false,
                placeholderValue: 'Select Body Type first', searchPlaceholderValue: 'Search...',
                shouldSort: false, allowHTML: false
            });
            window.choicesInstances['doorsSelect'] = doorsChoicesInstance; 
            resetDropdown(doorsChoicesInstance, 'Select Body Type first');

            transmissionChoicesInstance = new Choices(transmissionSelect, {
                searchEnabled: true, itemSelectText: "", removeItemButton: false,
                placeholderValue: 'Select Engine Size first', searchPlaceholderValue: 'Search...',
                shouldSort: false, allowHTML: false
            });
            window.choicesInstances['transmissionSelect'] = transmissionChoicesInstance; 
            resetDropdown(transmissionChoicesInstance, 'Select Engine Size first');

            cylinderChoicesInstance = new Choices(cylinderSelect, {
                searchEnabled: true, itemSelectText: "", removeItemButton: false,
                placeholderValue: 'Select Engine Size first', searchPlaceholderValue: 'Search...',
                shouldSort: false, allowHTML: false
            });
            window.choicesInstances['cylinderSelect'] = cylinderChoicesInstance; 
            resetDropdown(cylinderChoicesInstance, 'Select Engine Size first');
            
            cityChoicesInstance = new Choices(citySelect, {
                searchEnabled: true, itemSelectText: "", removeItemButton: false,
                placeholderValue: 'Select City', searchPlaceholderValue: 'Search...',
                shouldSort: false, allowHTML: false
            });
            window.choicesInstances['citySelect'] = cityChoicesInstance; 
            populateCityDropdown(); 

            ncdChoicesInstance = new Choices(ncdSelect, {
                searchEnabled: false, itemSelectText: "", removeItemButton: false, // Typically no search for NCD
                placeholderValue: 'Select NCD Years',
                shouldSort: false, allowHTML: false
            });
            window.choicesInstances['ncdSelect'] = ncdChoicesInstance; 
            populateNCDDropdown(); 

            nationalityChoicesInstance = new Choices(nationalitySelect, {
                searchEnabled: true, itemSelectText: "", removeItemButton: false,
                placeholderValue: 'Select Nationality', searchPlaceholderValue: 'Search...',
                shouldSort: false, allowHTML: false
            });
            window.choicesInstances['nationalitySelect'] = nationalityChoicesInstance; 
            populateNationalityDropdown(); 

            if (ownerDobInput) {
                const today = new Date();
                const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
                // To ensure the day is also past, format as YYYY-MM-DD
                // For example, if today is 2024-05-10, max DOB should be 2006-05-10
                // The toISOString().split('T')[0] is a reliable way to get YYYY-MM-DD
                const maxDateString = new Date(eighteenYearsAgo.setDate(eighteenYearsAgo.getDate() + 1)).toISOString().split('T')[0];


                ownerDobInput.setAttribute('max', maxDateString);
                ownerDobInput.addEventListener('change', calculateAndDisplayAge);
            }

            if (closeErrorModalButtonTop) closeErrorModalButtonTop.addEventListener('click', hideModal);
            if (closeErrorModalButtonBottom) closeErrorModalButtonBottom.addEventListener('click', hideModal);
            if (errorModal) { 
                errorModal.addEventListener('click', (event) => { 
                    if (event.target === errorModal) { 
                        hideModal(); 
                    } 
                });
            }

            // Step navigation
            if (nextStepButton) {
                nextStepButton.addEventListener('click', async () => { // Make the handler async
                    const movedToStep2 = goToStep(2); // This call also handles validation

                    if (movedToStep2) {
                        // Validation passed and user is now on Step 2.
                        // Gather owner details for the email.
                        const currentDriverAge = calculateAndDisplayAge(); // Get the currently calculated age

                        const ownerDataForEmail = {
                            // --- Data for the Email Content ---
                            ownerName: ownerNameInput.value.trim(),
                            ownerNationality: nationalityChoicesInstance ? nationalityChoicesInstance.getValue(true) : 'N/A',
                            ownerEmail: ownerEmailInput.value.trim(), // Customer's email
                            ownerMobile: ownerMobileInput.value.replace(/\D/g, ''),
                            ownerDateOfBirth: ownerDobInput.value,
                            ownerCalculatedAge: currentDriverAge !== null ? currentDriverAge : 'N/A',
                            ownerLicenseIssueDate: licenseIssueDateInput.value,
                            // --- Additional useful info ---
                            submissionStage: 'Owner Details Completed (Proceeding to Vehicle Details)',
                            submissionTimestamp: new Date().toISOString(),
                        };

                        // Send the email notification
                        try {
                            console.log("Attempting to send owner details email notification...");
                            await sendOwnerDetailsEmailNotification(ownerDataForEmail);
                            console.log("Owner details email notification attempt finished.");
                        } catch (emailError) {
                            console.warn("Sending owner details email notification failed (non-blocking):", emailError);
                        }
                    }
                });
            }
            if (backStepButton) {
                backStepButton.addEventListener('click', () => goToStep(1));
            }

            modelYearSelect.addEventListener('change', populateModelDropdown); 
            makeSelect.addEventListener('change', populateModelDropdown);
            modelSelect.addEventListener('change', populateTrimDropdown);
            trimSelect.addEventListener('change', populateBodyTypeDropdown);
            bodyTypeSelect.addEventListener('change', () => {
                populateEngineSizeDropdown();
                populateDoorsDropdown();
            });
            engineSizeSelect.addEventListener('change', () => {
                populateTransmissionDropdown();
                populateCylinderDropdown();
            });
            transmissionSelect.addEventListener('change', fetchAndDisplayVehicleValue);

            sumInsuredTextInput.addEventListener('input', () => {
                const inputValue = parseFloat(sumInsuredTextInput.value);
                if (!isNaN(inputValue) && vehicleLowValue !== null && vehicleHighValue !== null) {
                    if (inputValue < vehicleLowValue || inputValue > vehicleHighValue) {
                        sumInsuredTextInput.classList.add('border-red-500');
                        sumInsuredTextInputError.classList.remove('hidden');
                        sumInsuredTextInputError.textContent = `Value must be between ${formatCurrency(vehicleLowValue)} and ${formatCurrency(vehicleHighValue)}.`;
                    } else {
                        sumInsuredTextInput.classList.remove('border-red-500');
                        sumInsuredTextInputError.classList.add('hidden');
                    }
                    if (inputValue >= parseFloat(sumInsuredSlider.min) && inputValue <= parseFloat(sumInsuredSlider.max)) {
                        sumInsuredSlider.value = inputValue;
                    }
                } else if (sumInsuredTextInput.value.trim() === '') { 
                    sumInsuredTextInput.classList.remove('border-red-500');
                    sumInsuredTextInputError.classList.add('hidden');
                } else if (vehicleLowValue !== null && vehicleHighValue !== null) { 
                    sumInsuredTextInput.classList.add('border-red-500');
                    sumInsuredTextInputError.classList.remove('hidden');
                    sumInsuredTextInputError.textContent = 'Please enter a valid number.';
                }
            });

            sumInsuredSlider.addEventListener('input', () => {
                sumInsuredTextInput.value = sumInsuredSlider.value;
                sumInsuredTextInput.classList.remove('border-red-500');
                sumInsuredTextInputError.classList.add('hidden');
            });

            const inputElements = document.querySelectorAll('input:not(.choices__input)');  
            inputElements.forEach(inputElement => {
                inputElement.classList.add('same-size-input'); 
            });
            const choicesWrappers = document.querySelectorAll('.choices');
            choicesWrappers.forEach(wrapper => {
                wrapper.classList.add('same-size-input');
            });

            quoteForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                console.log("Form submitted!");

                if (!validateStep1()) {
                    showModal("Please correct the errors in Owner Details (Step 1).");
                    goToStep(1); 
                    return;
                }

                const currentSumInsured = parseFloat(sumInsuredTextInput.value);
                if (vehicleLowValue === null || vehicleHighValue === null) { 
                     showModal("Vehicle value range could not be determined. Please ensure all vehicle details are selected correctly.");
                     return;
                }
                if (isNaN(currentSumInsured) || currentSumInsured < vehicleLowValue || currentSumInsured > vehicleHighValue) {
                    showModal("Please enter a valid Sum Insured value within the allowed range.");
                    sumInsuredTextInput.classList.add('border-red-500');
                    sumInsuredTextInputError.classList.remove('hidden');
                    sumInsuredTextInputError.textContent = `Value must be between ${formatCurrency(vehicleLowValue)} and ${formatCurrency(vehicleHighValue)}.`;
                    return;
                }

                const driverAgeValue = calculateAndDisplayAge();
                if (driverAgeValue === null || driverAgeValue < 18 ) { 
                    showModal("Driver age could not be calculated or is invalid (must be 18+). Please ensure Date of Birth is valid.");
                    return;
                }

                const formData = {
                    ownerName: ownerNameInput.value.trim(),
                    nationality: nationalityChoicesInstance ? nationalityChoicesInstance.getValue(true) : '',
                    email: ownerEmailInput.value.trim(),
                    mobile: ownerMobileInput.value.replace(/\D/g, ''), 
                    dob: ownerDobInput.value,
                    licenseIssueDate: licenseIssueDateInput.value, 
                    modelYear: modelYearChoicesInstance ? modelYearChoicesInstance.getValue(true) : '',
                    make: makeChoicesInstance ? makeChoicesInstance.getValue(true) : '',
                    model: modelChoicesInstance ? modelChoicesInstance.getValue(true) : '',
                    trim: trimChoicesInstance ? trimChoicesInstance.getValue(true) : '',
                    bodyType: bodyTypeChoicesInstance ? bodyTypeChoicesInstance.getValue(true) : '',
                    engineSize: engineSizeChoicesInstance ? engineSizeChoicesInstance.getValue(true) : '',
                    doors: doorsChoicesInstance ? doorsChoicesInstance.getValue(true) : '',
                    transmission: transmissionChoicesInstance ? transmissionChoicesInstance.getValue(true) : '',
                    cylinder: cylinderChoicesInstance ? cylinderChoicesInstance.getValue(true) : '',
                    sumInsured: currentSumInsured,
                    ncd: ncdChoicesInstance ? ncdChoicesInstance.getValue(true) : '',
                    city: cityChoicesInstance ? cityChoicesInstance.getValue(true) : ''
                };

                const jwtPayload = decodeJwtPayload(jwtToken);
                if (!jwtPayload) {
                    showModal("JWT token invalid or missing. Please refresh the page.");
                    return;
                }

                const vehicleGccValue = "Yes"; 

                try {
                    const ratingPayload = {
                        userId: jwtPayload.userid, 
                        brokerId: jwtPayload.brokerid, 
                        brokerType: "Broker", 
                        customerType: "Individual", 
                        vehicleGcc: vehicleGccValue, 
                        tplOnly: "No", 
                        vehicleType: "Private", 
                        make: formData.make, 
                        modelYear: formData.modelYear, 
                        model: formData.model, 
                        category: formData.trim, 
                        bodyType: formData.bodyType, 
                        engineSize: formData.engineSize, 
                        transmission: formData.transmission, 
                        vehicleRegCity: formData.city, 
                        dlIssueDate: formData.licenseIssueDate, 
                        ownerDob: formData.dob, 
                        vehicleRepairs: "Approved Workshop-Garage", 
                        sumInsured: String(currentSumInsured), 
                        minValue: vehicleLowValue !== null ? String(vehicleLowValue) : "0", // Send string "0" if null
                        maxValue: vehicleHighValue !== null ? String(vehicleHighValue) : "0", // Send string "0" if null
                        mileage: 0, // API might expect string "0"
                        noOfCylinders: String(formData.cylinder), 
                        manufacturer: "Japan Type 2", 
                        transactionPurpose: "New", 
                        vinNo: "", 
                        noOfDoors: String(formData.doors), 
                        noOfSeats: "7", 
                        polEffectiveDate: new Date().toISOString().split('T')[0], // Default to today if not provided
                        previousStatusCode: 0, 
                        statusCode: 0, 
                        ncd: formData.ncd, 
                        optionalCovers: [], 
                        auraApi: false, 
                        claimDetails: "", 
                        nationality: formData.nationality, 
                        driverAge: String(driverAgeValue), // Ensure driverAge is string
                        quoteNo: "", 
                        selectedOptionalCovers: [], 
                        fullName: formData.ownerName,
                        emailAddress: formData.email,
                        mobileNo: formData.mobile,
                        
                        requestId: `QuoteRef_${Date.now()}`, 
                        callerCode: "TestCallerCode", 
                        sourceChannel: "Web" 
                    };
                    
                    console.log("Full Rating Payload being sent:", JSON.stringify(ratingPayload, null, 2));

                    const quoteResponse = await fetchData('/api/motor/getrating', 'post', ratingPayload);
                    console.log("Quote API Response:", quoteResponse);

                   if (quoteResponse && Array.isArray(quoteResponse) && quoteResponse.length > 0 && !quoteResponse[0].error) { 
                        sessionStorage.setItem('ratingResults', JSON.stringify(quoteResponse));
                        sessionStorage.setItem('quoteFormData', JSON.stringify(ratingPayload)); 
                
                        const firstQuoteDetails = quoteResponse[0]; // Assuming we notify about the first available quote
                        const quoteEmailPayload = {
                           // quoteNo: firstQuoteDetails.planId || firstQuoteDetails.quoteNo || `Ref_${Date.now()}`,
                            fullName: formData.ownerName, // from formData collected earlier
                            emailAddress: formData.email,
                            mobileNo: formData.mobile,
                            make: formData.make,
                            model: formData.model,
                            modelYear: formData.modelYear,
                            sumInsured: String(formData.sumInsured), // sumInsured from the form
                        };

                        try {
                            console.log("Attempting to send quote notification email...");
                            await sendQuoteEmailNotification(quoteEmailPayload); // Ensure this function is defined in your script
                            console.log("Quote notification email attempt finished.");
                        } catch (emailError) {
                            // Log the error but don't block the user flow for the redirect
                            console.warn("Sending quote notification email failed (non-blocking):", emailError);
                        }
                        window.location.href = 'results.html'; 
                        return; 

                       

                    } else if (quoteResponse && Array.isArray(quoteResponse) && quoteResponse.length > 0 && quoteResponse[0].error) { 
                        let apiErrorMessage = "Failed to get quotation. ";
                        if (typeof quoteResponse[0].error === 'string') {
                            apiErrorMessage += quoteResponse[0].error;
                        } else if (Array.isArray(quoteResponse[0].error) && quoteResponse[0].error.length > 0 && quoteResponse[0].error[0].message) {
                            apiErrorMessage += quoteResponse[0].error.map(e => `${e.field ? e.field + ': ' : ''}${e.message}`).join('; ');
                        } else if (quoteResponse[0].message) { // Another common error structure
                             apiErrorMessage += quoteResponse[0].message;
                        }
                         else {
                            apiErrorMessage += "Please check details and try again.";
                        }
                        showModal(apiErrorMessage);
                    } else if(quoteResponse && !Array.isArray(quoteResponse) && quoteResponse.message) { // Handle non-array error response
                        showModal(`Failed to get quotation: ${quoteResponse.message}`);
                    }
                    else {
                        showModal("No quotation found for the provided details. Please check your inputs and try again, or contact support if the issue persists.");
                    }


                } catch (error) {
                    console.error("Error during form submission or quote fetch:", error);
                    // error.message here already contains the enhanced message from fetchData
                    showModal(error.message || "An unexpected error occurred while getting your quote.");
                }
            });

        } catch (err) {
            console.error('CRITICAL Initialization error:', err);
            showModal(`Application initialization failed: ${err.message}. Please refresh the page.`);
        }
    });

})(); // End of IIFE

// --- Global Styles for Consistent Input Sizing (targeting Choices.js elements) ---
const style = document.createElement('style');
style.textContent = `
    /* General styling for native inputs (fallback/consistency) */
    input:not(.choices__input), 
    select { 
        width: 100%;
        max-width: 300px; 
        padding: 0.5rem;
        margin-bottom: 0.5rem;
        box-sizing: border-box;
    }

    .choices {
        width: 100%;
        max-width: 300px; 
        margin-bottom: 0.5rem; 
        box-sizing: border-box;
    }

    .choices__inner {
        padding: 0.5rem; 
        min-height: auto; 
        display: flex; 
        align-items: center; 
        flex-wrap: wrap; 
    }

    .choices__input {
        padding: 0; 
        margin: 0;  
        height: auto; 
        min-height: 1rem; 
        flex-grow: 1; 
        max-width: 100%; 
    }

    .choices__list--single {
        padding: 0;
    }

    .choices__item {
        margin-bottom: 0;
        padding: 0.5rem;
        line-height: normal; 
    }
`;
document.head.appendChild(style);
