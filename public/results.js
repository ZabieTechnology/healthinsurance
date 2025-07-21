document.addEventListener('DOMContentLoaded', () => {
    console.log("Results page DOMContentLoaded."); // Log when script starts

    const resultsContainer = document.getElementById('results-container');
    const storedData = sessionStorage.getItem('ratingResults');
    // Optional: Clear the data after reading to prevent reuse on refresh
    // sessionStorage.removeItem('ratingResults'); // Keep this commented out during testing

    console.log("Stored data from sessionStorage:", storedData ? storedData.substring(0, 300) + "..." : "No data"); // Log a sample

    if (!storedData) {
        resultsContainer.innerHTML = `
            <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
              <p class="font-bold">No Results</p>
              <p>No premium results found in session. Please go back to the form and try again.</p>
            </div>`;
        return;
    }

    try {
        const results = JSON.parse(storedData);
        console.log("Parsed results for rendering:", results); // Log the parsed array

        if (!Array.isArray(results) || results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4" role="alert">
                  <p class="font-bold">No Quotes Available</p>
                  <p>No insurance quotes were available for the details provided.</p>
                </div>`;
            return;
        }

        // Clear loading message
        resultsContainer.innerHTML = '';

        // Generate HTML for each result
        results.forEach((quote, index) => {
            console.log(`Processing quote ${index}:`, quote); // Log each quote object
            if (!quote) {
                console.warn(`Quote at index ${index} is null or undefined. Skipping.`);
                return; // Skip this iteration if quote is not valid
            }

            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-6'; // Added mb-6 for spacing

            // ---- MODIFIED: Logo HTML Logic ----
            let logoHtml = '';
            let imgSrc = '';
            // Use insurerName for alt text primarily, fallback if not available
            let imgAlt = `${quote.insurerName || 'Insurer'} Logo`;

            if (quote.logoUrl && typeof quote.logoUrl === 'string' && quote.logoUrl.trim() !== '') {
                imgSrc = quote.logoUrl; // Use logoUrl if provided (for your custom products)
            } else if (!quote.isCustomProduct) {
                // If it's not a custom product AND logoUrl is missing, use default RAK logo
                imgSrc = '/css/images/RAK.png'; // Default logo for API results
                // For default logo, if quote.insurerName is generic or missing, a generic alt might be better
                // imgAlt = "RAK Insurance Logo"; // Or keep the dynamic one based on insurerName
            }

            if (imgSrc) { // Only create the img tag if imgSrc has been set
                logoHtml = `
                    <div class="mb-3 flex justify-center sm:justify-start">
                        <img src="${imgSrc}" alt="${imgAlt}" class="max-h-12 sm:max-h-16 object-contain">
                    </div>`;
                // console.log(`Logo HTML for ${quote.insurerName || 'Unnamed Plan'}: ${logoHtml}`);
            } else {
                // console.log(`No logo will be displayed for ${quote.insurerName || 'Unnamed Plan'}`);
            }
            // ---- END LOGO HTML Logic ----

            // Using optional chaining and nullish coalescing for safer access
            const planNameDisplay = quote.planName || quote.productName || 'Unnamed Plan';
            const premiumDisplay = quote.premium?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? 'N/A';
            const vatDisplay = quote.vat?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? 'N/A';
            const totalWithVatDisplay = quote.totalWithVat?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? (quote.totalPremium?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? 'N/A');
            const deductiblesDisplay = quote.deductibles?.toLocaleString() ?? (quote.deductible?.toLocaleString() ?? 'N/A'); // Check for deductible as well
            const vehicleRepairsDisplay = quote.vehicleRepairs || 'N/A';


            card.innerHTML = `
                ${logoHtml} 
                <p class="text-md text-gray-700 mb-4 text-center sm:text-left">${planNameDisplay}</p>

                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm mb-4">
                    <div>
                        <span class="text-gray-500 block">Premium (Excl. VAT):</span>
                        <span class="font-medium text-gray-800">AED ${premiumDisplay}</span>
                    </div>
                    <div>
                        <span class="text-gray-500 block">VAT (5%):</span>
                        <span class="font-medium text-gray-800">AED ${vatDisplay}</span>
                    </div>
                    <div class="sm:col-span-2 md:col-span-1"> 
                        <span class="text-gray-500 block">Total Premium (Incl. VAT):</span>
                        <span class="font-bold text-xl text-green-600">AED ${totalWithVatDisplay}</span>
                    </div>
                     <div>
                        <span class="text-gray-500 block">Deductible:</span>
                        <span class="font-medium text-gray-800">AED ${deductiblesDisplay}</span>
                    </div>
                    <div>
                        <span class="text-gray-500 block">Repair Type:</span>
                        <span class="font-medium text-gray-800">${vehicleRepairsDisplay}</span>
                    </div>
                    ${quote.isCustomProduct ? `
                        <div class="sm:col-span-2 md:col-span-3 mt-1">
                            <span class="inline-block bg-pink-100 text-pink-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">Special Offer</span>
                        </div>
                    ` : ''}
                </div>

                <div class="mt-4 border-t pt-4">
                    <h4 class="text-md font-semibold text-gray-700 mb-2">Key Benefits:</h4>
                    <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                        ${(quote.covers && Array.isArray(quote.covers) ? quote.covers : []) // Ensure quote.covers is an array
                            .filter(cover => cover && cover.type === 'Benefits' && cover.values && cover.values[0] && cover.values[0].value && !String(cover.values[0].value).toLowerCase().includes('not covered') && String(cover.values[0].value).toLowerCase() !== 'n/a')
                            .slice(0, 6) // Limit to 6 benefits for example
                            .map(cover => `<li><span class="font-semibold">${cover.name || 'Benefit'}:</span> <span class="text-gray-700">${cover.values[0].value}</span></li>`)
                            .join('') || '<li class="text-gray-500">Key benefits will be detailed in the policy schedule.</li>'}
                    </ul>
                </div>

                
            `;
            resultsContainer.appendChild(card);
        });

        // Add the new message after all results are displayed
        const additionalMessage = document.createElement('div');
        additionalMessage.className = 'bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mt-6 rounded-lg shadow-md';
        additionalMessage.innerHTML = `
            <p class="font-bold">We’ve got more options for you!</p>
            <p>To ensure you get the best possible coverage and price, we’re working behind the scenes to match your details with a wider range of insurers.</p>
            <p>While we review your details, our agent will contact you shortly with more deals for your vehicle.</p>
        `;
        resultsContainer.appendChild(additionalMessage);


    } catch (e) {
        console.error("Error parsing or displaying results data:", e);
        resultsContainer.innerHTML = `
            <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
              <p class="font-bold">Error Displaying Results</p>
              <p>Could not display the premium results. Please check the console for errors and try again.</p>
            </div>`;
    }
});
