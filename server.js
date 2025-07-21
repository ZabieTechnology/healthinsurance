const express = require('express');
const path = require('path');
const axios = require('axios');
const session =require('express-session');
const app = express();
const port = process.env.PORT || 3000;
require('dotenv').config();

const nodemailer = require('nodemailer');

const UAE_VAT_RATE = 0.05;

function calculateYearsDifference(dateString) {
    if (!dateString) return 0;
    try {
        const pastDate = new Date(dateString);
        const today = new Date();
        if (isNaN(pastDate.getTime())) {
            console.warn("calculateYearsDifference: Invalid date string received:", dateString);
            return 0;
        }
        let years = today.getFullYear() - pastDate.getFullYear();
        const monthDiff = today.getMonth() - pastDate.getMonth();
        const dayDiff = today.getDate() - pastDate.getDate();
        if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
            years--;
        }
        return Math.max(0, years);
    } catch (e) {
        console.error("Error calculating years difference for date:", dateString, e);
        return 0;
    }
}

function getSukoonTplBasePremium(bodyType, numCylindersStr) {
    const normalizedBodyType = bodyType ? String(bodyType).toUpperCase().trim() : "";
    const cylinders = parseInt(numCylindersStr, 10);
    if (isNaN(cylinders)) {
        console.warn("getSukoonTplBasePremium: Invalid cylinder input:", numCylindersStr);
        return null;
    }
    if (normalizedBodyType.includes("SALOON") || normalizedBodyType.includes("SEDAN")) {
        if (cylinders === 4) return 600; if (cylinders === 6) return 680; if (cylinders === 8) return 760; if (cylinders > 8) return 1040;
    } else if (normalizedBodyType.includes("SUV") || normalizedBodyType.includes("SPORT UTILITY")) {
        if (cylinders === 4) return 800; if (cylinders === 6) return 840; if (cylinders === 8) return 880; if (cylinders > 8) return 960;
    } else if (normalizedBodyType.includes("COUPE")) {
        if (cylinders === 4) return 750; if (cylinders === 6) return 850; if (cylinders === 8) return 950; if (cylinders > 8) return 1300;
    }
    return null;
}

const ALLIANCE_EXCLUDED_MAKES_RAW_COMP = [
    "Abarth", "Alfa Romeo", "Aston Martin", "Bestune", "Borgward", "Bugatti", "Bizzarrini", "Buick",
    "Chrysler", "Citroen", "Devel", "Dorcen", "Ferrari", "Fiat", "Foton", "Hongqi", "Lamborghini",
    "Lincoln", "Lotus", "Mahindra", "Maserati", "McLaren", "Mini cooper", "Opel", "Polestar",
    "RAM", "Renault", "Sandstorm", "Skoda", "Soueast", "Subaru", "ZNA",
    "Rolls Royce", "Bentley", "Cadillac", "Jaguar", "Porsche", "Audi", "Volkswagen", "Peugeot", "Chevrolet"
];
const ALLIANCE_EXCLUDED_MAKES_COMP = new Set(ALLIANCE_EXCLUDED_MAKES_RAW_COMP.map(make => make.toUpperCase().replace("MINI COOPER", "MINI")));


function getAllianceComprehensivePremiumAndDeductible(bodyType, vehicleValueStr) {
    const normalizedBodyType = bodyType ? String(bodyType).toUpperCase().trim() : "";
    const vehicleValue = parseFloat(vehicleValueStr);
    if (isNaN(vehicleValue) || vehicleValue <= 0) {
        console.warn("Alliance Premium: Invalid vehicle value:", vehicleValueStr);
        return null;
    }

    let basePremium = null;
    if (normalizedBodyType.includes("SALOON") || normalizedBodyType.includes("SEDAN")) {
        basePremium = vehicleValue <= 60000 ? 1500 : vehicleValue * 0.025;
    } else if (normalizedBodyType.includes("SUV") || normalizedBodyType.includes("SPORT UTILITY")) {
        basePremium = vehicleValue <= 80000 ? 2000 : vehicleValue * 0.025;
    }
    if (basePremium === null) {
        console.warn(`Alliance Premium: No Comp pricing rule for body type '${normalizedBodyType}'.`);
        return null;
    }

    let deductible = 0;
    if (vehicleValue <= 50000) deductible = 350;
    else if (vehicleValue <= 100000) deductible = 500;
    else if (vehicleValue <= 250000) deductible = 750;
    else if (vehicleValue <= 500000) deductible = 1000;
    else deductible = 1400;

    return { basePremium: parseFloat(basePremium.toFixed(2)), deductible };
}

function getAllianceTplBasePremium(bodyType, numCylindersStr) {
    const normalizedBodyType = bodyType ? String(bodyType).toUpperCase().trim() : "";
    const cylinders = parseInt(numCylindersStr, 10);
    if (isNaN(cylinders)) {
        console.warn("getAllianceTplBasePremium: Invalid cylinder input:", numCylindersStr);
        return null;
    }
    if (normalizedBodyType.includes("SALOON") || normalizedBodyType.includes("SEDAN")) {
        if (cylinders === 4) return 750; if (cylinders === 6) return 850; if (cylinders === 8) return 950; if (cylinders > 8) return 1300;
    } else if (normalizedBodyType.includes("SUV") || normalizedBodyType.includes("SPORT UTILITY")) {
        if (cylinders === 4) return 1000; if (cylinders === 6) return 1050; if (cylinders === 8) return 1100; if (cylinders > 8) return 1600;
    } else if (normalizedBodyType.includes("COUPE")) {
        if (cylinders === 4) return 1300; if (cylinders === 6) return 1400; if (cylinders === 8) return 1600; if (cylinders > 8) return 2100;
    }
    return null;
}

function getJordanTplBasePremium(bodyType, numCylindersStr) {
    const normalizedBodyType = bodyType ? String(bodyType).toUpperCase().trim() : "";
    const cylinders = parseInt(numCylindersStr, 10);

    if (isNaN(cylinders)) {
        console.warn("getJordanTplBasePremium: Invalid cylinder input:", numCylindersStr);
        return null;
    }

    if (normalizedBodyType.includes("SALOON") || normalizedBodyType.includes("SEDAN")) {
        if (cylinders === 4) return 750;
        if (cylinders === 6) return 850;
        if (cylinders === 8) return 950;
        if (cylinders > 8) return 1300;
    } else if (normalizedBodyType.includes("SUV") || normalizedBodyType.includes("SPORT UTILITY")) {
        if (cylinders === 4) return 1000;
        if (cylinders === 6) return 1050;
        if (cylinders === 8) return 1100;
        if (cylinders > 8) return 1600;
    } else if (normalizedBodyType.includes("COUPE")) {
        if (cylinders === 4) return 1300;
        if (cylinders === 6) return 1400;
        if (cylinders === 8) return 1600;
        if (cylinders > 8) return 2100;
    }
    return null;
}

const JORDAN_EXCLUDED_MAKES_RAW_COMP = [
    "Abarth", "Alfa Romeo", "Aston Martin", "Bestune", "Borgward", "Bugatti", "Bizzarrini", "Buick",
    "Chrysler", "Citroen", "Devel", "Dorcen", "Ferrari", "Fiat", "Foton", "Hongqi", "Lamborghini",
    "Lincoln", "Lotus", "Mahindra", "Maserati", "McLaren", "MINI", "Opel", "Polestar",
    "RAM", "Renault", "Sandstorm", "Skoda", "Soueast", "Subaru", "ZNA",
    "Rolls Royce", "Bentley", "Cadillac", "Jaguar", "Porsche", "Audi", "Volkswagen", "Peugeot", "Chevrolet"
];
const JORDAN_EXCLUDED_MAKES_COMP = new Set(JORDAN_EXCLUDED_MAKES_RAW_COMP.map(make => make.toUpperCase()));

function getJordanComprehensivePremiumAndDeductible(bodyType, vehicleValueStr) {
    const normalizedBodyType = bodyType ? String(bodyType).toUpperCase().trim() : "";
    const vehicleValue = parseFloat(vehicleValueStr);

    if (isNaN(vehicleValue) || vehicleValue <= 0) {
        console.warn("getJordanComprehensivePremiumAndDeductible: Invalid vehicle value:", vehicleValueStr);
        return null;
    }

    let basePremium = null;
    if (normalizedBodyType.includes("SALOON") || normalizedBodyType.includes("SEDAN")) {
        basePremium = vehicleValue <= 50000 ? 1500 : vehicleValue * 0.03;
    } else if (normalizedBodyType.includes("SUV") || normalizedBodyType.includes("SPORT UTILITY")) {
        basePremium = vehicleValue <= 60000 ? 1800 : vehicleValue * 0.03;
    }

    if (basePremium === null) {
        console.warn(`getJordanComprehensivePremiumAndDeductible: No pricing rule for body type '${normalizedBodyType}'.`);
        return null;
    }

    let deductible = 0; // ASSUMPTION: Deductible logic mirrors Alliance Comprehensive.
    if (vehicleValue <= 50000) deductible = 350;
    else if (vehicleValue <= 100000) deductible = 500;
    else if (vehicleValue <= 250000) deductible = 750;
    else if (vehicleValue <= 500000) deductible = 1000;
    else deductible = 1400;

    return { basePremium: parseFloat(basePremium.toFixed(2)), deductible };
}

const LIVA_EXCLUDED_MAKES_RAW_COMP = [
    "Abarth", "Alfa Romeo", "Aston Martin", "Bestune", "Borgward", "Bugatti", "Bizzarrini", "Buick",
    "Chrysler", "Citroen", "Devel", "Dorcen", "Ferrari", "Fiat", "Foton", "Hongqi", "Lamborghini",
    "Lincoln", "Lotus", "Mahindra", "Maserati", "McLaren", "MINI", "Opel", "Polestar",
    "RAM", "Renault", "Sandstorm", "Skoda", "Soueast", "Subaru", "ZNA",
    "Rolls Royce", "Bentley", "Cadillac", "Jaguar", "Porsche", "Audi", "Volkswagen", "Peugeot", "Chevrolet",
    "Geely", "Jetour", "Jac", "Gac", "BYD", "Tesla"
];
const LIVA_EXCLUDED_MAKES_COMP = new Set(LIVA_EXCLUDED_MAKES_RAW_COMP.map(make => make.toUpperCase()));
const LIVA_ALLOWED_NATIONALITIES_COMP = new Set(["INDIA", "UK", "US", "PHILIPPINE", "FRANCE", "CANADA"]);

function getLivaComprehensivePremiumAndDeductible(bodyType, vehicleValueStr) {
    const normalizedBodyType = bodyType ? String(bodyType).toUpperCase().trim() : "";
    const vehicleValue = parseFloat(vehicleValueStr);

    if (isNaN(vehicleValue) || vehicleValue <= 0) {
        console.warn("getLivaComprehensivePremiumAndDeductible: Invalid vehicle value:", vehicleValueStr);
        return null;
    }

    let basePremium = null;
    if (normalizedBodyType.includes("SALOON") || normalizedBodyType.includes("SEDAN")) {
        if (vehicleValue <= 60000) {
            basePremium = 1900;
        } else {
            return null;
        }
    } else if (normalizedBodyType.includes("SUV") || normalizedBodyType.includes("SPORT UTILITY")) {
        if (vehicleValue <= 70000) {
            basePremium = 2000;
        } else {
            return null;
        }
    }

    if (basePremium === null) {
        return null;
    }

    let deductible = 0; // ASSUMPTION: Deductible for Liva. USER TO CONFIRM.
    if (vehicleValue <= 50000) deductible = 350;
    else if (vehicleValue <= 100000) deductible = 500;
    else if (vehicleValue <= 250000) deductible = 750;
    else if (vehicleValue <= 500000) deductible = 1000;
    else deductible = 1400;

    return { basePremium: parseFloat(basePremium.toFixed(2)), deductible };
}

// +++ AL ITTIHAD AL WATANI Logic Helpers +++
function getAlIttihadComprehensivePremiumAndDeductible(bodyType, vehicleValueStr, vehicleMake) { // Added vehicleMake parameter
    const normalizedBodyType = bodyType ? String(bodyType).toUpperCase().trim() : "";
    const normalizedProvidedMake = vehicleMake ? String(vehicleMake).toUpperCase().trim() : ""; // Normalize the make passed to the function
    const vehicleValue = parseFloat(vehicleValueStr);

    // Ensure this logic is only applied if the make is TESLA
    if (normalizedProvidedMake !== "TESLA") {
        console.warn(`getAlIttihadComprehensivePremiumAndDeductible: This premium logic is specific to TESLA. Called with make: '${normalizedProvidedMake}'. Returning null.`);
        return null;
    }

    if (isNaN(vehicleValue) || vehicleValue <= 0) {
        console.warn("getAlIttihadComprehensivePremiumAndDeductible: Invalid vehicle value:", vehicleValueStr);
        return null;
    }

    let basePremium = null;
    // Premium calculation for Tesla based on specified body types
    if (normalizedBodyType.includes("SALOON") || normalizedBodyType.includes("SEDAN") || normalizedBodyType.includes("SUV")) {
        basePremium = vehicleValue * 0.045;
    }

    if (basePremium === null) {
        // This would mean it's a Tesla but not one of the specified body types (Saloon, Station)
        console.warn(`getAlIttihadComprehensivePremiumAndDeductible: No pricing rule for Tesla with body type '${normalizedBodyType}'.`);
        return null;
    }

    // ASSUMPTION: Deductible logic for Al Ittihad. USER TO CONFIRM/PROVIDE.
    // Currently mirroring Alliance/Jordan.
    let deductible = 0;
    if (vehicleValue <= 50000) deductible = 350;
    else if (vehicleValue <= 100000) deductible = 500;
    else if (vehicleValue <= 250000) deductible = 750;
    else if (vehicleValue <= 500000) deductible = 1000;
    else deductible = 1400;
    // If Al Ittihad has a standard deductible (e.g., for Non-Agency), replace the above logic.

    return { basePremium: parseFloat(basePremium.toFixed(2)), deductible };
}

// +++ SUKOON INSURANCE COMPREHENSIVE Logic Helpers +++
const SUKOON_EXCLUDED_MAKES_RAW_COMP = [
    "Abarth", "Alfa Romeo", "Aston Martin", "Bestune", "Borgward", "Bugatti", "Bizzarrini", "Buick", "Chrysler",
    "Citroen", "Devel", "Dorcen", "Ferrari", "Fiat", "Foton", "Hongqi", "Lamborghini", "Lincoln", "Lotus",
    "Mahindra", "Maserati", "McLaren", "MINI", "Opel", "Polestar", "RAM", "Renault", "Sandstorm",
    "Skoda", "Soueast", "Subaru", "ZNA", "Rolls Royce", "Bentley", "Cadillac", "Jaguar", "Porsche",
    "Audi", "Volkswagen", "Peugeot", "Chevrolet", "Tesla"
];
const SUKOON_EXCLUDED_MAKES_COMP = new Set(SUKOON_EXCLUDED_MAKES_RAW_COMP.map(make => make.toUpperCase()));
const SUKOON_ALLOWED_NATIONALITIES_COMP = new Set(["INDIA", "UK", "US", "PHILIPPINE", "FRANCE", "CANADA"]); // Same as Liva

function getSukoonComprehensivePremiumAndDeductible(bodyType, vehicleValueStr) {
    const normalizedBodyType = bodyType ? String(bodyType).toUpperCase().trim() : "";
    const vehicleValue = parseFloat(vehicleValueStr);

    if (isNaN(vehicleValue) || vehicleValue <= 0) {
        console.warn("getSukoonComprehensivePremiumAndDeductible: Invalid vehicle value:", vehicleValueStr);
        return null;
    }

    let basePremium = null;
    if (normalizedBodyType.includes("SALOON") || normalizedBodyType.includes("SEDAN")) {
        if (vehicleValue <= 60000) {
            basePremium = 1900;
        } else {
            console.log("Sukoon Comp (Saloon): Vehicle value > 60k, not eligible for this Sukoon plan.");
            return null; // Do not display if value > 60k for Saloon
        }
    } else if (normalizedBodyType.includes("SUV") || normalizedBodyType.includes("SPORT UTILITY")) {
        if (vehicleValue <= 70000) {
            basePremium = 2000;
        } else {
            console.log("Sukoon Comp (SUV): Vehicle value > 70k, not eligible for this Sukoon plan.");
            return null; // Do not display if value > 70k for SUV
        }
    }

    if (basePremium === null) {
        console.warn(`getSukoonComprehensivePremiumAndDeductible: No pricing rule for body type '${normalizedBodyType}' or value out of range.`);
        return null;
    }

    // ASSUMPTION: Deductible logic for Sukoon Comp (Not specified by user). Mirroring Alliance/Jordan. USER TO CONFIRM/PROVIDE.
    let deductible = 0;
    if (vehicleValue <= 50000) deductible = 350;
    else if (vehicleValue <= 100000) deductible = 500;
    else if (vehicleValue <= 250000) deductible = 750;
    else if (vehicleValue <= 500000) deductible = 1000;
    else deductible = 1400;

    return { basePremium: parseFloat(basePremium.toFixed(2)), deductible };
}


async function addCustomInsuranceProducts(apiResults, originalRequest) {
    console.log("--- Entering addCustomInsuranceProducts ---");
    let productsArray = [];
    let originalStructureWasObject = false;
    let productsKey = null;

    if (Array.isArray(apiResults)) {
        productsArray = [...apiResults];
    } else if (apiResults && typeof apiResults === 'object') {
        originalStructureWasObject = true;
        const potentialKeys = ['products', 'ratingResults', 'data', 'items', 'rates', 'result', 'RateList', 'RateSheetList'];
        for (const key of potentialKeys) {
            if (apiResults[key] && Array.isArray(apiResults[key])) {
                productsKey = key;
                productsArray = [...apiResults[key]];
                console.log(`addCustomInsuranceProducts: Found products array in key: '${productsKey}'`);
                break;
            }
        }
        if (!productsKey) {
            console.warn("addCustomInsuranceProducts: Could not find array key in API response object. API Response:", JSON.stringify(apiResults).substring(0, 200));
            if (apiResults.error || (apiResults.Message && apiResults.ErrorCode) || (apiResults.errors && Array.isArray(apiResults.errors))) {
                console.log("addCustomInsuranceProducts: API response appears to be an error object, returning as is.");
                return apiResults;
            }
        }
    } else {
        console.warn("addCustomInsuranceProducts: API response not array or recognized object.", apiResults);
        return apiResults;
    }
    console.log(`Initial productsArray length from API: ${productsArray.length}`);

    const ratingPayload = originalRequest.body;
    if (!ratingPayload) {
        console.warn("addCustomInsuranceProducts: Rating payload missing in original request.");
        return apiResults;
    }

    const driverAge = parseInt(ratingPayload.driverAge, 10);
    const dlIssueDate = ratingPayload.dlIssueDate;
    const bodyType = ratingPayload.bodyType;
    const numCylinders = ratingPayload.noOfCylinders;
    const vehicleMake = ratingPayload.make;
    const vehicleValueStr = ratingPayload.sumInsured;
    const vehicleIsGCC = (String(ratingPayload.vehicleGcc).toUpperCase() === "YES");
    const normalizedVehicleMake = vehicleMake ? String(vehicleMake).toUpperCase().trim() : "";
    const normalizedBodyType = bodyType ? String(bodyType).toUpperCase().trim() : "";
    const licenseTenure = calculateYearsDifference(dlIssueDate);
    const vehicleYear = parseInt(ratingPayload.modelYear, 10);
    const nationality = ratingPayload.nationality ? String(ratingPayload.nationality).toUpperCase().trim() : "";

    let sukoonCompProductToAdd = null; // New
    let alIttihadCompProductToAdd = null;
    let livaCompProductToAdd = null;
    let jordanCompProductToAdd = null;
    let jordanTplProductToAdd = null;
    let sukoonTplProductToAdd = null; // Existing Sukoon TPL
    let allianceCompProductToAdd = null;
    let allianceTplProductToAdd = null;

    const hasCoreEligibilityData = !isNaN(driverAge) && dlIssueDate && bodyType;
    const hasCoreCompData = hasCoreEligibilityData && vehicleMake && vehicleValueStr !== undefined && vehicleValueStr !== null && !isNaN(vehicleYear);

    // --- Process Sukoon Insurance Comprehensive (NEW) ---
    if (hasCoreCompData && nationality) {
        console.log(`Sukoon Comp Check -> GCC: ${vehicleIsGCC}, Age: ${driverAge}, License: ${licenseTenure}, Nationality: ${nationality}, Year: ${vehicleYear}, Make: ${normalizedVehicleMake}, BodyType: ${normalizedBodyType}`);
        if (vehicleIsGCC &&
            driverAge >= 30 &&
            licenseTenure >= 1 &&
            SUKOON_ALLOWED_NATIONALITIES_COMP.has(nationality) &&
            vehicleYear >= 2011 && vehicleYear <= 2025 &&
            !SUKOON_EXCLUDED_MAKES_COMP.has(normalizedVehicleMake) &&
            !normalizedBodyType.includes("COUPE")) {
            console.log("Sukoon Comp: Eligibility criteria met.");
            const sukoonCompData = getSukoonComprehensivePremiumAndDeductible(bodyType, vehicleValueStr);
            if (sukoonCompData) {
                const { basePremium, deductible } = sukoonCompData;
                const vatAmount = parseFloat((basePremium * UAE_VAT_RATE).toFixed(2));
                const totalPremium = parseFloat((basePremium + vatAmount).toFixed(2));
                sukoonCompProductToAdd = {
                    insurerId: "SUKOON_COMP_CUSTOM_NEW", insurerCode: "SUKOONINS", insurerName: "Sukoon Insurance", // Distinguish from Sukoon Takaful
                    planId: "SUKOON_COMP_NONAGENCY_01", productName: "Comprehensive", planName: "Sukoon Insurance - Comprehensive (Non-Agency)",
                    coverageType: "Comprehensive",
                    premium: basePremium, vat: vatAmount, totalWithVat: totalPremium,
                    deductibles: deductible, // ASSUMED - USER TO CONFIRM
                    vehicleRepairs: "Non Agency", // As specified
                    agencyRepairYears: 0,
                    covers: [ // USER TO PROVIDE/CONFIRM FULL BENEFIT LIST
                        { name: "Own Damage to Insured Vehicle", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Third Party Liability - Property Damage", type: "Benefits", values: [{ value: "Up to AED 3,500,000" }] },
                        { name: "Third Party Liability - Bodily Injury", type: "Benefits", values: [{ value: "As per UAE Law" }] },
                        { name: "Personal Accident - Driver", type: "Benefits", values: [{ value: "Up to AED 200,000" }] },
                        { name: "Personal Accident - Passengers", type: "Benefits", values: [{ value: "Up to AED 200,000" }] },
                        { name: "Roadside Assistance (24/7)", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Natural Disasters (Storm, Flood)", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Fire & Theft Cover", type: "Benefits", values: [{ value: "Covered" }] }
                    ],
                    netPremium: basePremium, grossPremium: totalPremium, vatAmount: vatAmount, totalPremium: totalPremium,
                    currency: "AED", isCustomProduct: true, logoUrl: "/css/images/Sukoon_Insurance.png", // Reusing existing Sukoon logo
                    features: ["Comprehensive Cover", "Non-Agency Repair", "PA Benefits", "Roadside Assistance"], // Example
                    premiumBreakdown: [{ label: "Base Premium", amount: basePremium, code: "BASE" }, { label: `VAT (${UAE_VAT_RATE * 100}%)`, amount: vatAmount, code: "VAT" }],
                    policyNo: null, policyExpiry: null, benefits: [],
                    policyWordingLink: null, termsAndConditionsLink: null,
                };
                console.log("Sukoon Comp (New): Custom product created.");
            } else { console.log("Sukoon Comp (New): Pricing rule failed (likely value out of range)."); }
        } else { console.log("Sukoon Comp (New): Eligibility criteria failed."); }
    } else { console.log("Sukoon Comp (New): Skipped due to missing core eligibility data (incl. nationality)."); }


    // --- Process Al Ittihad Al Watani Comprehensive ---
    if (hasCoreCompData) {
        console.log(`Al Ittihad Comp Check -> GCC: ${vehicleIsGCC}, Age: ${driverAge}, License: ${licenseTenure}, Year: ${vehicleYear}, Make: ${normalizedVehicleMake}, BodyType: ${normalizedBodyType}`);
        if (vehicleIsGCC &&
            driverAge >= 35 &&
            licenseTenure >= 1 &&
            vehicleYear >= 2015 && vehicleYear <= 2025 &&
            normalizedVehicleMake === "TESLA" &&
            (normalizedBodyType.includes("SALOON") || normalizedBodyType.includes("SEDAN") || normalizedBodyType.includes("STATION"))
        ) {
            console.log("Al Ittihad Comp: Eligibility criteria met.");
            const alIttihadData = getAlIttihadComprehensivePremiumAndDeductible(bodyType, vehicleValueStr);
            if (alIttihadData) {
                const { basePremium, deductible } = alIttihadData;
                const vatAmount = parseFloat((basePremium * UAE_VAT_RATE).toFixed(2));
                const totalPremium = parseFloat((basePremium + vatAmount).toFixed(2));
                alIttihadCompProductToAdd = {
                    insurerId: "ALITTIHAD_COMP_CUSTOM", insurerCode: "ALITTIHAD", insurerName: "Al Ittihad Al Watani",
                    planId: "ALITTIHAD_COMP_TESLA_01", productName: "Comprehensive (Tesla)", planName: "Al Ittihad - Comprehensive Plan (Tesla)",
                    coverageType: "Comprehensive",
                    premium: basePremium, vat: vatAmount, totalWithVat: totalPremium,
                    deductibles: deductible, // ASSUMED - USER TO CONFIRM
                    vehicleRepairs: "Non Agency",
                    agencyRepairYears: 0,
                    covers: [ // USER TO PROVIDE FULL BENEFIT LIST
                        { name: "Own Damage to Insured Vehicle", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Third Party Liability - Property Damage", type: "Benefits", values: [{ value: "Up to AED 2,000,000" }] },
                        { name: "Third Party Liability - Bodily Injury", type: "Benefits", values: [{ value: "As per UAE Law" }] },
                    ],
                    netPremium: basePremium, grossPremium: totalPremium, vatAmount: vatAmount, totalPremium: totalPremium,
                    currency: "AED", isCustomProduct: true, logoUrl: "/css/images/al_ittihad_logo.jpg",
                    features: ["Comprehensive for Tesla", "Non-Agency Repair"],
                    premiumBreakdown: [{ label: "Base Premium", amount: basePremium, code: "BASE" }, { label: `VAT (${UAE_VAT_RATE * 100}%)`, amount: vatAmount, code: "VAT" }],
                    policyNo: null, policyExpiry: null, benefits: [],
                    policyWordingLink: null, termsAndConditionsLink: null,
                };
                console.log("Al Ittihad Comp: Custom product created.");
            } else { console.log("Al Ittihad Comp: Pricing rule failed."); }
        } else { console.log("Al Ittihad Comp: Eligibility criteria failed."); }
    } else { console.log("Al Ittihad Comp: Skipped due to missing core eligibility data."); }

    // --- Process Liva Insurance Comprehensive ---
    if (hasCoreCompData && nationality) {
        console.log(`Liva Comp Check -> GCC: ${vehicleIsGCC}, Age: ${driverAge}, License: ${licenseTenure}, Nationality: ${nationality}, Year: ${vehicleYear}, Make: ${normalizedVehicleMake}, BodyType: ${normalizedBodyType}`);
        if (vehicleIsGCC &&
            driverAge >= 30 &&
            licenseTenure >= 1 &&
            LIVA_ALLOWED_NATIONALITIES_COMP.has(nationality) &&
            vehicleYear >= 2011 && vehicleYear <= 2025 &&
            !LIVA_EXCLUDED_MAKES_COMP.has(normalizedVehicleMake) &&
            !normalizedBodyType.includes("COUPE")) {
            console.log("Liva Comp: Eligibility criteria met.");
            const livaData = getLivaComprehensivePremiumAndDeductible(bodyType, vehicleValueStr);
            if (livaData) {
                const { basePremium, deductible } = livaData;
                const vatAmount = parseFloat((basePremium * UAE_VAT_RATE).toFixed(2));
                const totalPremium = parseFloat((basePremium + vatAmount).toFixed(2));
                livaCompProductToAdd = {
                    insurerId: "LIVA_COMP_CUSTOM", insurerCode: "LIVA", insurerName: "Liva Insurance",
                    planId: "LIVA_COMP_01", productName: "Comprehensive", planName: "Liva Insurance - Comprehensive Plan",
                    coverageType: "Comprehensive",
                    premium: basePremium, vat: vatAmount, totalWithVat: totalPremium,
                    deductibles: deductible, // ASSUMED - USER TO CONFIRM
                    vehicleRepairs: "Non Agency",
                    agencyRepairYears: 0,
                    covers: [ // USER TO PROVIDE FULL BENEFIT LIST
                        { name: "Own Damage to Insured Vehicle", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Third Party Liability - Property Damage", type: "Benefits", values: [{ value: "Up to AED 2,000,000" }] },
                        { name: "Third Party Liability - Bodily Injury", type: "Benefits", values: [{ value: "As per UAE Law" }] },
                    ],
                    netPremium: basePremium, grossPremium: totalPremium, vatAmount: vatAmount, totalPremium: totalPremium,
                    currency: "AED", isCustomProduct: true, logoUrl: "/css/images/liva_insurance_logo.png",
                    features: ["Comprehensive Cover", "Non-Agency Repair"],
                    premiumBreakdown: [{ label: "Base Premium", amount: basePremium, code: "BASE" }, { label: `VAT (${UAE_VAT_RATE * 100}%)`, amount: vatAmount, code: "VAT" }],
                    policyNo: null, policyExpiry: null, benefits: [],
                    policyWordingLink: null, termsAndConditionsLink: null,
                };
                console.log("Liva Comp: Custom product created.");
            } else { console.log("Liva Comp: Pricing rule failed (likely value out of range)."); }
        } else { console.log("Liva Comp: Eligibility criteria failed."); }
    } else { console.log("Liva Comp: Skipped due to missing core eligibility data (incl. nationality)."); }

    // --- Process Jordan Insurance Comprehensive ---
    if (hasCoreCompData) {
        console.log(`Jordan Comp Check -> GCC: ${vehicleIsGCC}, Age: ${driverAge}, License Tenure: ${licenseTenure}, Make: ${normalizedVehicleMake}, BodyType: ${normalizedBodyType}, Value: ${vehicleValueStr}`);
        if (vehicleIsGCC &&
            driverAge >= 25 &&
            licenseTenure >= 1 &&
            !JORDAN_EXCLUDED_MAKES_COMP.has(normalizedVehicleMake) &&
            !normalizedBodyType.includes("COUPE")) {
            console.log("Jordan Comp: Basic eligibility criteria met.");
            const jordanCompData = getJordanComprehensivePremiumAndDeductible(bodyType, vehicleValueStr);
            if (jordanCompData) {
                console.log("Jordan Comp: Premium/Deductible data retrieved:", jordanCompData);
                const { basePremium, deductible } = jordanCompData;
                const vatAmount = parseFloat((basePremium * UAE_VAT_RATE).toFixed(2));
                const totalPremium = parseFloat((basePremium + vatAmount).toFixed(2));
                jordanCompProductToAdd = {
                    insurerId: "JORDAN_COMP_CUSTOM", insurerCode: "JORDANINS", insurerName: "Jordan Insurance",
                    planId: "JORDAN_COMP_01", productName: "Comprehensive", planName: "Jordan Insurance - Comprehensive Plan",
                    coverageType: "Comprehensive",
                    premium: basePremium, vat: vatAmount, totalWithVat: totalPremium,
                    deductibles: deductible,
                    vehicleRepairs: "Agency Repair", // ASSUMED - User to confirm
                    agencyRepairYears: 1,           // ASSUMED - User to confirm
                    covers: [
                        { name: "Loss & Damage to Insured Vehicle", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Third Party Liability - Property Damage", type: "Benefits", values: [{ value: "Up to AED 2,000,000" }] },
                        { name: "Third Party Liability - Bodily Injury", type: "Benefits", values: [{ value: "As per UAE Law" }] },
                        { name: "Personal Accident - Driver", type: "Benefits", values: [{ value: "Up to AED 200,000" }] },
                        { name: "Personal Accident - Family Members", type: "Benefits", values: [{ value: "Up to AED 200,000" }] },
                        { name: "Roadside Assistance (24/7)", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Natural Calamities (Storm, Flood)", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Fire & Theft Cover", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Ambulance Cover", type: "Benefits", values: [{ value: `Up to AED ${Number(6770).toLocaleString()}` }] }
                    ],
                    netPremium: basePremium, grossPremium: totalPremium, vatAmount: vatAmount, totalPremium: totalPremium,
                    currency: "AED", isCustomProduct: true, logoUrl: "/css/images/jordan_insurance_logo.png",
                    features: ["Comprehensive Cover", "PA for Driver & Family", "Roadside Assistance", "Natural Calamity, Fire & Theft"],
                    premiumBreakdown: [
                        { label: "Base Premium", amount: basePremium, code: "BASE" },
                        { label: `VAT (${UAE_VAT_RATE * 100}%)`, amount: vatAmount, code: "VAT" }
                    ],
                    policyNo: null, policyExpiry: null, benefits: [],
                    policyWordingLink: null, termsAndConditionsLink: null,
                };
                console.log("Jordan Comp: Custom product object created.");
            } else { console.log("Jordan Comp: Not eligible - pricing rules failed."); }
        } else { console.log("Jordan Comp: Not eligible - initial criteria failed."); }
    } else { console.log("Jordan Comp: Skipped due to missing core eligibility data from payload."); }

    // --- Process Jordan Insurance TPL ---
    if (hasCoreEligibilityData && numCylinders) {
        console.log(`Jordan TPL Check -> Age: ${driverAge}, License Tenure: ${licenseTenure} years, BodyType: ${bodyType}, Cylinders: ${numCylinders}`);
        if (driverAge >= 25 && licenseTenure >= 1) {
            console.log("Jordan TPL: Eligibility criteria met.");
            const jordanBasePremium = getJordanTplBasePremium(bodyType, numCylinders);
            if (jordanBasePremium !== null) {
                console.log(`Jordan TPL: Base premium calculated: AED ${jordanBasePremium}`);
                const vatAmount = parseFloat((jordanBasePremium * UAE_VAT_RATE).toFixed(2));
                const totalPremium = parseFloat((jordanBasePremium + vatAmount).toFixed(2));
                jordanTplProductToAdd = {
                    insurerId: "JORDAN_TPL_CUSTOM", insurerCode: "JORDANINS", insurerName: "Jordan Insurance",
                    planId: "JORDAN_TPL_01", productName: "Third Party Liability", planName: "Jordan Insurance - Third Party Liability",
                    coverageType: "Third Party",
                    premium: jordanBasePremium, vat: vatAmount, totalWithVat: totalPremium,
                    deductibles: 0, vehicleRepairs: "Not Applicable",
                    covers: [
                        { name: "Third Party Liability - Property Damage", type: "Benefits", values: [{ value: "Up to AED 2,000,000" }] },
                        { name: "Third Party Liability - Bodily Injury", type: "Benefits", values: [{ value: "As per UAE Law" }] },
                        { name: "Personal Accident - Driver", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Personal Accident - Passengers", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Roadside Assistance (24/7)", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Ambulance Cover", type: "Benefits", values: [{ value: `Up to AED ${Number(6770).toLocaleString()}` }] }
                    ],
                    netPremium: jordanBasePremium, grossPremium: totalPremium, vatAmount: vatAmount, totalPremium: totalPremium,
                    currency: "AED", isCustomProduct: true, logoUrl: "/css/images/jordan_insurance_logo.png",
                    features: ["Third Party Liability", "PA Benefits", "24/7 Roadside Assistance", "Ambulance Cover"],
                    premiumBreakdown: [
                        { label: "Base Premium", amount: jordanBasePremium, code: "BASE" },
                        { label: `VAT (${UAE_VAT_RATE * 100}%)`, amount: vatAmount, code: "VAT" }
                    ],
                    policyNo: null, policyExpiry: null, agencyRepairYears: 0, benefits: [],
                    policyWordingLink: null, termsAndConditionsLink: null,
                };
                console.log("Jordan TPL: Custom product object created.");
            } else { console.log(`Jordan TPL: No matching pricing rule for BodyType '${bodyType}' & Cylinders '${numCylinders}'.`); }
        } else { console.log("Jordan TPL: Eligibility criteria (Age/License) NOT met."); }
    } else { console.log("Jordan TPL: Skipped due to missing core eligibility data from payload."); }

    // --- Process Alliance Insurance Comprehensive ---
    if (hasCoreCompData) {
        console.log(`Alliance Comp Check -> GCC: ${vehicleIsGCC}, Age: ${driverAge}, License Tenure: ${licenseTenure}, Make: ${normalizedVehicleMake}, BodyType: ${normalizedBodyType}, Value: ${vehicleValueStr}`);
        if (vehicleIsGCC &&
            driverAge >= 25 &&
            licenseTenure >= 1 &&
            !ALLIANCE_EXCLUDED_MAKES_COMP.has(normalizedVehicleMake) &&
            !normalizedBodyType.includes("COUPE")) {
            console.log("Alliance Comp: Basic eligibility criteria met.");
            const allianceData = getAllianceComprehensivePremiumAndDeductible(bodyType, vehicleValueStr);
            if (allianceData) {
                console.log("Alliance Comp: Premium/Deductible data retrieved:", allianceData);
                const { basePremium, deductible } = allianceData;
                const vatAmount = parseFloat((basePremium * UAE_VAT_RATE).toFixed(2));
                const totalPremium = parseFloat((basePremium + vatAmount).toFixed(2));
                allianceCompProductToAdd = {
                    insurerId: "ALLIANCE_COMP_CUSTOM", insurerCode: "ALLIANCE", insurerName: "Alliance Insurance",
                    planId: "ALLIANCE_COMP_01", productName: "Comprehensive", planName: "Alliance Insurance Comprehensive",
                    coverageType: "Comprehensive",
                    premium: basePremium, vat: vatAmount, totalWithVat: totalPremium,
                    deductibles: deductible, vehicleRepairs: "Agency Repair",
                    agencyRepairYears: 1,
                    covers: [
                        { name: "Own Damage to Insured Vehicle", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Third Party Liability - Property Damage", type: "Benefits", values: [{ value: "Up to AED 3,500,000" }] },
                        { name: "Third Party Liability - Bodily Injury", type: "Benefits", values: [{ value: "As per UAE Law" }] },
                        { name: "Personal Accident - Driver", type: "Benefits", values: [{ value: "Up to AED 200,000" }] },
                        { name: "Personal Accident - Passengers", type: "Benefits", values: [{ value: "Up to AED 200,000" }] },
                        { name: "Roadside Assistance (24/7)", type: "Benefits", values: [{ value: "Covered (Call 600 508 181)" }] },
                        { name: "Windscreen Cover", type: "Benefits", values: [{ value: "Covered (Policy Excess Applies)" }] },
                        { name: "Natural Calamities (Storm, Flood)", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Fire & Theft Cover", type: "Benefits", values: [{ value: "Covered" }] }
                    ],
                    netPremium: basePremium, grossPremium: totalPremium, vatAmount: vatAmount, totalPremium: totalPremium,
                    currency: "AED", isCustomProduct: true, logoUrl: "/css/images/alliance_logo.svg",
                    features: ["Comprehensive Cover", "PA Benefits", "Roadside Assistance"],
                    premiumBreakdown: [
                        { label: "Base Premium", amount: basePremium, code: "BASE" },
                        { label: `VAT (${UAE_VAT_RATE * 100}%)`, amount: vatAmount, code: "VAT" }
                    ],
                    policyNo: null, policyExpiry: null, benefits: [],
                    policyWordingLink: null, termsAndConditionsLink: null,
                };
                console.log("Alliance Comp: Custom product object created.");
            } else { console.log("Alliance Comp: Not eligible - pricing rules failed."); }
        } else { console.log("Alliance Comp: Not eligible - initial criteria failed."); }
    } else { console.log("Alliance Comp: Skipped due to missing core eligibility data from payload.");}

    // --- Process Alliance Insurance TPL ---
    if (hasCoreEligibilityData && numCylinders) {
        console.log(`Alliance TPL Check -> Age: ${driverAge}, License Tenure: ${licenseTenure}, BodyType: ${bodyType}, Cylinders: ${numCylinders}`);
        if (driverAge >= 25 && licenseTenure >= 1) {
            console.log("Alliance TPL: Eligibility criteria met.");
            const allianceTplBasePremium = getAllianceTplBasePremium(bodyType, numCylinders);
            if (allianceTplBasePremium !== null) {
                console.log(`Alliance TPL: Base premium calculated: AED ${allianceTplBasePremium}`);
                const vatAmount = parseFloat((allianceTplBasePremium * UAE_VAT_RATE).toFixed(2));
                const totalPremium = parseFloat((allianceTplBasePremium + vatAmount).toFixed(2));
                allianceTplProductToAdd = {
                    insurerId: "ALLIANCE_TPL_CUSTOM", insurerCode: "ALLIANCE", insurerName: "Alliance Insurance",
                    planId: "ALLIANCE_TPL_01", productName: "Third Party Liability", planName: "Alliance Insurance - Third Party Liability",
                    coverageType: "Third Party",
                    premium: allianceTplBasePremium, vat: vatAmount, totalWithVat: totalPremium,
                    deductibles: 0, vehicleRepairs: "Not Applicable",
                    covers: [
                        { name: "Third Party Liability - Property Damage", type: "Benefits", values: [{ value: "Up to AED 2,000,000" }] },
                        { name: "Third Party Liability - Bodily Injury", type: "Benefits", values: [{ value: "As per UAE Law" }] },
                        { name: "Personal Accident - Driver", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Personal Accident - Passengers", type: "Benefits", values: [{ value: "Covered" }] },
                        { name: "Ambulance Cover", type: "Benefits", values: [{ value: "Up to AED 6,770 Per Person" }] },
                        { name: "Roadside Assistance (24/7)", type: "Benefits", values: [{ value: "Covered (Call 600 508 181)" }] }
                    ],
                    netPremium: allianceTplBasePremium, grossPremium: totalPremium, vatAmount: vatAmount, totalPremium: totalPremium,
                    currency: "AED", isCustomProduct: true, logoUrl: "/css/images/alliance_logo.svg",
                    features: ["Third Party Liability Cover", "PA Benefits Included", "Roadside Assistance"],
                    premiumBreakdown: [
                        { label: "Base Premium", amount: allianceTplBasePremium, code: "BASE" },
                        { label: `VAT (${UAE_VAT_RATE * 100}%)`, amount: vatAmount, code: "VAT" }
                    ],
                    policyNo: null, policyExpiry: null, agencyRepairYears: 0, benefits: [],
                    policyWordingLink: null, termsAndConditionsLink: null,
                };
                console.log("Alliance TPL: Custom product object created.");
            } else { console.log(`Alliance TPL: No matching pricing rule found.`); }
        } else { console.log("Alliance TPL: Eligibility criteria (Age/License) NOT met."); }
    } else { console.log("Alliance TPL: Skipped due to missing core eligibility data from payload."); }

    // --- Process Sukoon Takaful TPL (existing TPL product) ---
    if (hasCoreEligibilityData && numCylinders) {
        console.log(`Sukoon Takaful TPL Check -> Age: ${driverAge}, License Tenure: ${licenseTenure} years, BodyType: ${bodyType}, Cylinders: ${numCylinders}`);
        if (driverAge >= 25 && licenseTenure >= 3) { // Renamed variable for clarity
            console.log("Sukoon Takaful TPL: Eligibility criteria met.");
            const sukoonTplBasePremium = getSukoonTplBasePremium(bodyType, numCylinders); // Using existing TPL premium function
            if (sukoonTplBasePremium !== null) {
                console.log(`Sukoon Takaful TPL: Base premium calculated: AED ${sukoonTplBasePremium}`);
                const vatAmount = parseFloat((sukoonTplBasePremium * UAE_VAT_RATE).toFixed(2));
                const totalPremium = parseFloat((sukoonTplBasePremium + vatAmount).toFixed(2));
                sukoonTplProductToAdd = { // Note: This is the TPL product, not the new Sukoon Comp
                    insurerId: "SUKOON_TPL_CUSTOM", insurerCode: "SUKOON", insurerName: "Sukoon Takaful",
                    planId: "SUKOON_TPL_01", productName: "Third Party Liability", planName: "Third Party Liability (Sukoon Takaful)",
                    premium: sukoonTplBasePremium, vat: vatAmount, totalWithVat: totalPremium,
                    deductibles: 0, vehicleRepairs: "Not Applicable",
                    covers: [
                        { name: "Third Party Liability - Property Damage", type: "Benefits", values: [{ value: "Up to AED 2,000,000" }] },
                        { name: "Third Party Liability - Bodily Injury", type: "Benefits", values: [{ value: "As per UAE Law" }] },
                        { name: "Ambulance Cover", type: "Benefits", values: [{ value: `Up to AED ${Number(6770).toLocaleString()}` }] }
                    ],
                    netPremium: sukoonTplBasePremium, grossPremium: totalPremium, vatAmount: vatAmount, totalPremium: totalPremium,
                    currency: "AED", isCustomProduct: true, logoUrl: "/css/images/sukoon_logo.svg",
                    features: ["Third Party Liability Cover", "Ambulance Cover Included"],
                    premiumBreakdown: [
                        { label: "Base Premium", amount: sukoonTplBasePremium, code: "BASE" },
                        { label: `VAT (${UAE_VAT_RATE * 100}%)`, amount: vatAmount, code: "VAT" }
                    ],
                    policyNo: null, policyExpiry: null, agencyRepairYears: 0, benefits: [],
                    policyWordingLink: null, termsAndConditionsLink: null,
                };
                console.log("Sukoon Takaful TPL: Custom product object created.");
            } else { console.log(`Sukoon Takaful TPL: No matching pricing rule found.`); }
        } else { console.log("Sukoon Takaful TPL: Eligibility criteria (Age/License) NOT met."); }
    } else { console.log("Sukoon Takaful TPL: Skipped due to missing core eligibility data from payload."); }


    // --- Prepend custom products in desired order (last unshifted appears first) ---
    // New Order: Sukoon Comp, Al Ittihad Comp, Liva Comp, Jordan Comp, Jordan TPL, Sukoon TPL, Alliance Comp, Alliance TPL
    if (allianceTplProductToAdd) { productsArray.unshift(allianceTplProductToAdd); }
    if (allianceCompProductToAdd) { productsArray.unshift(allianceCompProductToAdd); }
    if (sukoonTplProductToAdd) { productsArray.unshift(sukoonTplProductToAdd); } // Existing Sukoon TPL
    if (jordanTplProductToAdd) { productsArray.unshift(jordanTplProductToAdd); }
    if (jordanCompProductToAdd) { productsArray.unshift(jordanCompProductToAdd); }
    if (livaCompProductToAdd) { productsArray.unshift(livaCompProductToAdd); }
    if (alIttihadCompProductToAdd) { productsArray.unshift(alIttihadCompProductToAdd); }
    if (sukoonCompProductToAdd) { productsArray.unshift(sukoonCompProductToAdd); } // New Sukoon Comp

    if (sukoonCompProductToAdd || alIttihadCompProductToAdd || livaCompProductToAdd || jordanCompProductToAdd || jordanTplProductToAdd || sukoonTplProductToAdd || allianceCompProductToAdd || allianceTplProductToAdd) {
        console.log("Custom products processed. Final products count after unshifting:", productsArray.length);
    }

    let finalResponseData;
    if (originalStructureWasObject) {
        if (productsKey) {
            finalResponseData = { ...apiResults };
            finalResponseData[productsKey] = productsArray;
            console.log(`addCustomInsuranceProducts: Reconstructed response object, updated key: '${productsKey}' with ${productsArray.length} products.`);
        } else {
            if (Object.keys(apiResults).length === 0 && productsArray.length > 0 && !Array.isArray(apiResults) ) {
                 finalResponseData = productsArray;
                 console.log("addCustomInsuranceProducts: Original API response was an empty object, returning array of custom products.");
            } else {
                console.warn("addCustomInsuranceProducts: Original response was OBJECT, but product array key not found/matched, and not an identified error. Returning ORIGINAL UNMODIFIED API response.", apiResults);
                finalResponseData = apiResults;
            }
        }
    } else {
        finalResponseData = productsArray;
        console.log("addCustomInsuranceProducts: Returning products array directly with " + productsArray.length + " products.");
    }
    return finalResponseData;
}
// === END: CUSTOM PRODUCT LOGIC ===


// --- Nodemailer SMTP Configuration ---
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

transporter.verify(function(error, success) {
  if (error) {
    console.error("!!! Nodemailer transporter verification failed:", error);
  } else {
    console.log("✅ Nodemailer transporter is ready to send emails.");
    console.log(`    Configured Sender: ${process.env.SMTP_USER}`);
    console.log(`    Configured Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
  }
});


// --- Middleware ---
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_very_secret_key_here_fallback',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 60 * 1000
    }
}));

// --- Auth API ---
app.get('/api/init', async (req, res) => {
    console.log(">>> ENTERED /api/init");
    try {
        const { API_USERNAME, API_PASSWORD, API_BASE_URL } = process.env;
        if (!API_USERNAME || !API_PASSWORD || !API_BASE_URL) {
            console.error("Server Configuration Error: API credentials or URL missing in .env");
            throw new Error('Server configuration error');
        }
        const response = await axios.post(`${API_BASE_URL}/login/authenticate`, {
            username: API_USERNAME,
            password: API_PASSWORD
        }, { timeout: 30000 });
        const token = response?.data?.token;
        if (!token) {
            console.error("Authentication successful but token not found in response:", response?.data);
            throw new Error('Token not received from external API');
        }
        console.log("Token successfully retrieved.");
        res.json({ token });
    } catch (error) {
        let statusCode = 500; let errorMessage = `Authentication failed: ${error?.message || 'Unknown error'}`; let errorDetails = null;
        if (error.response) { statusCode = error.response.status; errorMessage = error.response.data?.error || error.response.data?.message || `External API Error (${statusCode})`; errorDetails = error.response.data; console.error(`External API Error (${statusCode}) during auth:`, errorDetails); }
        else if (error.request) { statusCode = 504; errorMessage = 'No response from authentication server'; console.error(errorMessage, error.code || ''); }
        else if (error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout')) { statusCode = 504; errorMessage = 'Authentication service timed out'; console.error(errorMessage); }
        else { console.error("Unexpected error during auth:", error); }
        res.status(statusCode).json({ error: errorMessage, details: errorDetails });
    }
});

// --- Generic GET Proxy Handler Function ---
const createGetProxyHandler = (endpoint, requiredParams = []) => async (req, res) => {
    const targetEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    try {
        const authHeader = req.headers.authorization; if (!authHeader?.startsWith('Bearer ')) { console.warn(`GET Proxy ${targetEndpoint}: Missing or invalid Authorization header.`); return res.status(401).json({ error: 'Authorization Bearer token required' }); } const token = authHeader.split(' ')[1];
        for (const param of requiredParams) { if (!req.query[param]) { console.warn(`GET Proxy ${targetEndpoint}: Missing required query parameter '${param}'.`); return res.status(400).json({ error: 'Missing required query parameters', required: requiredParams, received: Object.keys(req.query) }); } }
        const baseUrl = process.env.API_BASE_URL; if (!baseUrl) { console.error(`GET Proxy ${targetEndpoint}: API_BASE_URL not configured in .env`); throw new Error('Server configuration error (API base URL missing)'); } const url = `${baseUrl}${targetEndpoint}`;
        const externalResponse = await axios.get(url, { params: req.query, headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }, timeout: 20000 });
        res.status(externalResponse.status).json(externalResponse.data);
    } catch (error) {
        let statusCode = 500; let responseData = { error: `Proxy error fetching data for ${targetEndpoint}`, details: error.message };
        if (error.response) { statusCode = error.response.status; responseData = error.response.data || { error: `External API Error (${statusCode}) for ${targetEndpoint}` }; console.error(`GET Proxy ${targetEndpoint}: External API Error (${statusCode}):`, responseData); }
        else if (error.request) { statusCode = 504; responseData = { error: `No response from external service for ${targetEndpoint}` }; console.error(`GET Proxy ${targetEndpoint}: ${responseData.error}`, error.code || ''); }
        else if (error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout')) { statusCode = 504; responseData = { error: `External service for ${targetEndpoint} timed out` }; console.error(`GET Proxy ${targetEndpoint}: ${responseData.error}`); }
        else { console.error(`GET Proxy ${targetEndpoint}: Unexpected error:`, error); } res.status(statusCode).json(responseData);
    }
};

// --- Generic POST Proxy Handler Function ---
const createPostProxyHandler = (endpoint, requiredBodyFields = [], modifyResponseCallback = null) => async (req, res) => {
    const targetEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    console.log(`-> POST Proxy request received for: ${targetEndpoint}`);
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            console.warn(`POST Proxy ${targetEndpoint}: Missing or invalid Authorization header.`);
            return res.status(401).json({ error: 'Authorization Bearer token required' });
        }
        const token = authHeader.split(' ')[1];

        if (!req.body || typeof req.body !== 'object') {
            console.warn(`POST Proxy ${targetEndpoint}: Invalid or missing request body.`);
            return res.status(400).json({ error: 'Valid JSON request body required' });
        }

        if (targetEndpoint === '/api/motor/getrating') {
            if (String(req.body.vehicleGcc).toUpperCase() === 'NO' && String(req.body.tplOnly).toUpperCase() !== 'YES') {
                console.warn(`   SERVER OVERRIDE: vehicleGcc is 'No', forcing tplOnly to 'Yes' for ${targetEndpoint}. Original tplOnly: ${req.body.tplOnly}`);
                req.body.tplOnly = 'Yes';
            }
        }

        const baseUrl = process.env.API_BASE_URL;
        if (!baseUrl) {
            console.error(`POST Proxy ${targetEndpoint}: API_BASE_URL not configured in .env`);
            throw new Error('Server configuration error (API base URL missing)');
        }
        const url = `${baseUrl}${targetEndpoint}`;

        const externalResponse = await axios.post(url, req.body, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 45000
        });

        let responseData = externalResponse.data;
        if (modifyResponseCallback) {
            console.log(`   Applying POST modification callback for ${targetEndpoint}`);
            responseData = await modifyResponseCallback(responseData, req);
        }
        res.status(externalResponse.status).json(responseData);

    } catch (error) {
        let statusCode = 500;
        let responseData = { error: `Proxy error posting data for ${targetEndpoint}`, details: error.message };
        if (error.response) { statusCode = error.response.status; responseData = error.response.data || { error: `External API Error (${statusCode}) for ${targetEndpoint}` }; console.error(`POST Proxy ${targetEndpoint}: External API Error (${statusCode}):`, responseData); }
        else if (error.request) { statusCode = 504; responseData = { error: `No response from external service for ${targetEndpoint}` }; console.error(`POST Proxy ${targetEndpoint}: ${responseData.error}`, error.code || ''); }
        else if (error.code === 'ETIMEDOUT' || error.message.toLowerCase().includes('timeout')) { statusCode = 504; responseData = { error: `External service for ${targetEndpoint} timed out` }; console.error(`POST Proxy ${targetEndpoint}: ${responseData.error}`); }
        else { console.error(`POST Proxy ${targetEndpoint}: Unexpected error:`, error); } res.status(statusCode).json(responseData);
    }
};


// --- Motor API Proxy Endpoints ---
app.get('/api/motor/getmodel', createGetProxyHandler('/api/motor/getmodel', ['ModelYear', 'Make', 'vehicleType']));
app.get('/api/motor/gettrim', createGetProxyHandler('/api/motor/gettrim', ['ModelYear', 'Make', 'Model', 'vehicleType']));
app.get('/api/motor/getbody', createGetProxyHandler('/api/motor/getbody', ['ModelYear', 'Make', 'Model', 'Trim', 'vehicleType']));
app.get('/api/motor/getenginesize', createGetProxyHandler('/api/motor/getenginesize', ['ModelYear', 'Make', 'Model', 'Trim', 'BodyType', 'vehicleType']));
app.get('/api/motor/getdoor', createGetProxyHandler('/api/motor/getdoor', ['ModelYear', 'Make', 'Model', 'BodyType', 'Trim', 'vehicleType']));

const transmissionRequiredFields = ['modelYear', 'make', 'model', 'trim', 'bodyType', 'engineSize', 'vehicleType'];
app.post('/api/motor/gettransmission', createPostProxyHandler('/api/motor/gettransmission', transmissionRequiredFields));

const cylinderRequiredFields = ['modelYear', 'make', 'model', 'trim', 'engineSize', 'vehicleType'];
app.post('/api/motor/getcylinders', createPostProxyHandler('/api/motor/getcylinders', cylinderRequiredFields));

const vehicleValueRequiredFields = [
    'modelYear', 'make', 'model', 'trim', 'engineSize',
    'bodyType', 'transmission', 'vehicleType', 'mileage', 'callerCode',
    'tplOnly', 'transactionPurpose',
    'isNewVehicle', 'requestId'
];
app.post('/api/motor/getvehiclevalue', createPostProxyHandler('/api/motor/getvehiclevalue', vehicleValueRequiredFields));

app.post('/api/motor/getrating', createPostProxyHandler(
    '/api/motor/getrating',
    [],
    addCustomInsuranceProducts
));


// --- Email Notification Endpoints ---
app.post('/api/send-quote-notification', async (req, res) => {
    console.log('-> POST /api/send-quote-notification received.');
    const quoteData = req.body;
    console.log('Quote data for /api/send-quote-notification:', JSON.stringify(quoteData, null, 2));
    const recipientEmail = process.env.NOTIFICATION_EMAIL_RECIPIENT;
    const senderEmail = process.env.SMTP_USER;

    if (!quoteData || Object.keys(quoteData).length === 0) {
        console.warn('Quote email: Received empty request body.');
        return res.status(400).send({ message: 'Request body missing or empty.' });
    }
    if (!recipientEmail) {
        console.error('Quote email: NOTIFICATION_EMAIL_RECIPIENT not set. Cannot send email.');
        return res.status(500).send({ message: 'Notification recipient not configured server-side.' });
    }
    if (!senderEmail) {
        console.error('Quote email: SMTP_USER (sender) not set. Cannot send email.');
        return res.status(500).send({ message: 'Notification sender not configured server-side.' });
    }
    if (!transporter || !transporter.options || !transporter.options.host) {
        console.error('Quote email: Nodemailer transporter unconfigured. Cannot send email.');
        return res.status(500).send({ message: 'Email service not configured server-side.' });
    }

    const mailOptions = {
        from: `"Savington Motor Insurance" <${senderEmail}>`,
        to: recipientEmail,
        subject: `New Quote Request - ${quoteData.make || 'N/A'} ${quoteData.model || 'N/A'} (${quoteData.modelYear || 'N/A'})`,
        text: `A new quote request has been generated:\n\n` +
             // `Reference: ${quoteData.quoteReference || 'N/A'}\n` +
              `Full Name: ${quoteData.fullName || 'N/A'}\n` +
              `Email: ${quoteData.emailAddress || 'N/A'}\n` +
              `Mobile: ${quoteData.mobileNo || 'N/A'}\n` +
              `Vehicle: ${quoteData.modelYear || 'N/A'} ${quoteData.make || 'N/A'} ${quoteData.model || 'N/A'}\n` +
              `Sum Insured: AED ${quoteData.sumInsured ? Number(quoteData.sumInsured).toLocaleString() : 'N/A'}\n` +
             // `Premium: AED ${quoteData.premium ? Number(quoteData.premium).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'}\n` +
              //`Insurer: ${quoteData.insurerName || 'N/A'}\n` +
             // `Plan: ${quoteData.planName || 'N/A'}\n\n` +
              `Please follow up accordingly.`,
        html: `<p>A new quote request has been generated:</p>
               <ul>
                 <li><strong>Full Name:</strong> ${quoteData.fullName || 'N/A'}</li>
                 <li><strong>Email:</strong> ${quoteData.emailAddress || 'N/A'}</li>
                 <li><strong>Mobile:</strong> ${quoteData.mobileNo || 'N/A'}</li>
                 <li><strong>Vehicle:</strong> ${quoteData.modelYear || 'N/A'} ${quoteData.make || 'N/A'} ${quoteData.model || 'N/A'}</li>
                 <li><strong>Sum Insured:</strong> AED ${quoteData.sumInsured ? Number(quoteData.sumInsured).toLocaleString() : 'N/A'}</li>
               </ul>
               <p>Please follow up accordingly.</p>`,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log(`<- Quote email notification sent successfully: ${info.messageId}`);
        res.status(202).send({ message: 'Notification accepted for delivery.' });
    } catch (error) {
        console.error('!!! Error sending quote notification email via Nodemailer:', error);
        res.status(202).send({ message: 'Notification accepted, but email dispatch failed server-side.' });
    }
});

app.post('/api/send-owner-details-notification', async (req, res) => {
    console.log('-> POST /api/send-owner-details-notification received.');
    const ownerData = req.body;
    const recipientEmail = process.env.OWNER_DETAILS_RECIPIENT_EMAIL || process.env.NOTIFICATION_EMAIL_RECIPIENT;
    const senderEmail = process.env.SMTP_USER;

    if (!ownerData || Object.keys(ownerData).length === 0) {
        console.warn('Owner details email: Received empty or missing request body.');
        return res.status(400).send({ message: 'Request body missing or empty.' });
    }
    if (!recipientEmail) {
        console.error('Owner details email: Recipient email (OWNER_DETAILS_RECIPIENT_EMAIL or NOTIFICATION_EMAIL_RECIPIENT) not set. Cannot send email.');
        return res.status(500).send({ message: 'Email notification recipient not configured on server.' });
    }
    if (!senderEmail) {
        console.error('Owner details email: SMTP_USER (sender) not set. Cannot send email.');
        return res.status(500).send({ message: 'Email notification sender not configured on server.' });
    }
    if (!transporter || !transporter.options || !transporter.options.host) {
        console.error('Owner details email: Nodemailer transporter unconfigured. Cannot send email.');
        return res.status(500).send({ message: 'Email service not configured on server.' });
    }

    const subject = `New Lead (Owner Details): ${ownerData.ownerName || 'N/A'}`;
    const textBody = `The following owner details were submitted after completing Step 1 of the insurance form:\n\n` +
        `Name: ${ownerData.ownerName || 'N/A'}\n` +
        `Nationality: ${ownerData.ownerNationality || 'N/A'}\n` +
        `Email: ${ownerData.ownerEmail || 'N/A'}\n` +
        `Mobile: ${ownerData.ownerMobile || 'N/A'}\n` +
        `Date of Birth: ${ownerData.ownerDateOfBirth || 'N/A'}\n` +
        `Calculated Age: ${ownerData.ownerCalculatedAge !== undefined && ownerData.ownerCalculatedAge !== 'N/A' ? ownerData.ownerCalculatedAge + ' years' : 'N/A'}\n` +
        `License Issue Date: ${ownerData.ownerLicenseIssueDate || 'N/A'}\n` +
        `Submission Stage: ${ownerData.submissionStage || 'Owner Details Completed'}\n` +
        `Timestamp: ${ownerData.submissionTimestamp ? new Date(ownerData.submissionTimestamp).toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Dubai' }) : 'N/A'} (Asia/Dubai)\n\n` +
        `Please follow up as needed.`;

    const htmlBody = `
        <p>The following owner details were submitted after completing Step 1 of the insurance form:</p>
        <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 14px;">
            <tr style="background-color: #f2f2f2;"><td style="width: 30%; padding: 8px;"><strong>Name:</strong></td><td style="padding: 8px;">${ownerData.ownerName || 'N/A'}</td></tr>
            <tr><td style="background-color: #f2f2f2; padding: 8px;"><strong>Nationality:</strong></td><td style="padding: 8px;">${ownerData.ownerNationality || 'N/A'}</td></tr>
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px;"><strong>Email:</strong></td><td style="padding: 8px;">${ownerData.ownerEmail || 'N/A'}</td></tr>
            <tr><td style="background-color: #f2f2f2; padding: 8px;"><strong>Mobile:</strong></td><td style="padding: 8px;">${ownerData.ownerMobile || 'N/A'}</td></tr>
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px;"><strong>Date of Birth:</strong></td><td style="padding: 8px;">${ownerData.ownerDateOfBirth || 'N/A'}</td></tr>
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px;"><strong>Calculated Age:</strong></td><td style="padding: 8px;">${ownerData.ownerCalculatedAge !== undefined && ownerData.ownerCalculatedAge !== 'N/A' ? ownerData.ownerCalculatedAge + ' years' : 'N/A'}</td></tr>
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px;"><strong>License Issue Date:</strong></td><td style="padding: 8px;">${ownerData.ownerLicenseIssueDate || 'N/A'}</td></tr>
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px;"><strong>Submission Stage:</strong></td><td style="padding: 8px;">${ownerData.submissionStage || 'Owner Details Completed'}</td></tr>
            <tr style="background-color: #f2f2f2;"><td style="padding: 8px;"><strong>Timestamp:</strong></td><td style="padding: 8px;">${ownerData.submissionTimestamp ? new Date(ownerData.submissionTimestamp).toLocaleString('en-AE', { dateStyle: 'medium', timeStyle: 'long', timeZone: 'Asia/Dubai' }) : 'N/A'} (Asia/Dubai)</td></tr>
        </table>
        <p>Please follow up as needed.</p>
    `;

    const mailOptions = {
        from: `"Savington Insurance Form" <${senderEmail}>`,
        to: recipientEmail,
        subject: subject,
        text: textBody,
        html: htmlBody,
    };

    try {
        let info = await transporter.sendMail(mailOptions);
        console.log(`<- Owner details email notification sent successfully: ${info.messageId} to ${recipientEmail}`);
        res.status(202).send({ message: 'Owner details notification accepted for delivery.' });
    } catch (error) {
        console.error('!!! Error sending owner details notification email via Nodemailer:', error);
        res.status(202).send({ message: 'Owner details notification accepted, but email dispatch failed server-side.' });
    }
});


// --- Root Route ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Catch-all for 404 ---
app.use((req, res) => {
    console.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
    const CATCH_ALL_404_PAGE = path.join(__dirname, 'public', '404.html');
    if (require('fs').existsSync(CATCH_ALL_404_PAGE)) {
        res.status(404).sendFile(CATCH_ALL_404_PAGE);
    } else {
        res.status(404).send('404 Not Found');
    }
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error("!!! Unhandled Error:", err.stack || err);
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred.'
    });
});


// --- Start Server ---
app.listen(port, () => {
    console.log(`\n🚀 Server running successfully on http://localhost:${port}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Serving static files from: ${path.join(__dirname, 'public')}`);
    console.log(`   API Base URL configured: ${process.env.API_BASE_URL ? `Yes (${process.env.API_BASE_URL})` : 'No - Proxy WILL FAIL!'}`);
    console.log(`   API Username configured: ${process.env.API_USERNAME ? 'Yes' : 'No - Auth WILL FAIL!'}`);
});
