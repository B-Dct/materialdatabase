import fs from 'fs';

// Simulated row generator to spot the mismatch
const generateTestRows = () => {
    // 1. Setup mock data similar to what we observed
    const properties = [
        { id: 'prop-resin', name: 'Resin Content', testMethods: ['tm-base'] }
    ];
    
    const requirements = [
        { propertyId: 'prop-resin', min: 38, max: 42, referenceArchitectureId: 'arch-type1' }
    ];
    
    // The spec has base architecture
    const specifications = [
        { propertyId: 'prop-resin', vMin: 38, vMax: 42, referenceArchitectureId: undefined }
    ];
    
    console.log("Req Row Key:", `prop-resin_arch-type1_base`);
    console.log("Spec Row Key:", `prop-resin_base_base`);
    
    // In comparison view:
    // It groups by row.referenceArchitectureName.
    // Req goes to "DS_M0001 - Type 1" group.
    // Spec goes to "Base Material" group.
    console.log("AHA! Requirements are bound to 'Type 1' architecture, but Specs are bound to 'Base' architecture.");
};

generateTestRows();
