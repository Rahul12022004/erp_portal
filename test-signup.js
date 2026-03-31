#!/usr/bin/env node

const testSchoolRegistration = async () => {
  const testData = {
    schoolName: "Demo School",
    schoolEmail: "demo@school.com",
    schoolPhone: "+1234567890",
    schoolAddress: "123 Demo Street",
    schoolWebsite: "https://demo-school.com",
    adminName: "Demo Admin",
    adminEmail: "admin@demo-school.com",
    adminPhone: "+1234567890",
    schoolType: "Public",
    maxStudents: "500",
    subscriptionPlan: "Standard"
  };

  try {
    console.log("Testing School Registration Endpoint...\n");
    console.log("Sending request to: http://localhost:5000/api/schools/register");
    console.log("Data:", JSON.stringify(testData, null, 2));
    console.log("\n---\n");

    const response = await fetch("http://localhost:5000/api/schools/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log("\n✅ Registration successful!");
      console.log(`School ID: ${result.data._id}`);
      console.log(`Admin Email: ${result.data.adminEmail}`);
    } else {
      console.log("\n❌ Registration failed!");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
};

testSchoolRegistration();
