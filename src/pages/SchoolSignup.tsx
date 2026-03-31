import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle, Copy } from "lucide-react";
import { PricingInteraction } from "@/components/ui/pricing-interaction";
import { API_URL } from "@/lib/api";

type Plan = "Basic" | "Standard" | "Premium";

export default function SchoolSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"details" | "plan" | "success">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [successData, setSuccessData] = useState<any>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const [formData, setFormData] = useState({
    schoolName: "",
    schoolEmail: "",
    schoolPhone: "",
    schoolAddress: "",
    schoolWebsite: "",
    adminName: "",
    adminEmail: "",
    adminPhone: "",
    schoolType: "Public",
    maxStudents: "500",
    subscriptionPlan: "Basic" as Plan,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateDetails = () => {
    if (
      !formData.schoolName ||
      !formData.schoolEmail ||
      !formData.schoolPhone ||
      !formData.adminName ||
      !formData.adminEmail
    ) {
      setError("Please fill in all required fields");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.schoolEmail) || !emailRegex.test(formData.adminEmail)) {
      setError("Please enter valid email addresses");
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateDetails()) {
      setError("");
      setStep("plan");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/schools/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      setSuccessData(data.data);
      setSuccessMessage(
        `School registered successfully! Admin credentials have been sent to ${formData.adminEmail}`
      );
      setStep("success");

      setTimeout(() => {
        navigate("/");
      }, 7000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Join ERP Portal</h1>
          <p className="text-lg text-slate-600">
            Streamline your school management with our comprehensive platform
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle>School Registration</CardTitle>
            <CardDescription className="text-blue-100">
              Step {step === "details" ? "1" : step === "plan" ? "2" : "3"} of 3
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-8">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: School Details */}
            {step === "details" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    School Name *
                  </label>
                  <Input
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleInputChange}
                    placeholder="Enter school name"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      School Email *
                    </label>
                    <Input
                      name="schoolEmail"
                      type="email"
                      value={formData.schoolEmail}
                      onChange={handleInputChange}
                      placeholder="school@example.com"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      School Phone *
                    </label>
                    <Input
                      name="schoolPhone"
                      value={formData.schoolPhone}
                      onChange={handleInputChange}
                      placeholder="Phone number"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    School Address
                  </label>
                  <Input
                    name="schoolAddress"
                    value={formData.schoolAddress}
                    onChange={handleInputChange}
                    placeholder="School address"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Website
                  </label>
                  <Input
                    name="schoolWebsite"
                    value={formData.schoolWebsite}
                    onChange={handleInputChange}
                    placeholder="https://school.com"
                    disabled={loading}
                  />
                </div>

                <hr className="my-6" />

                <div>
                  <h3 className="font-semibold text-slate-900 mb-4">School Administrator</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Admin Name *
                    </label>
                    <Input
                      name="adminName"
                      value={formData.adminName}
                      onChange={handleInputChange}
                      placeholder="Full name"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Admin Email *
                    </label>
                    <Input
                      name="adminEmail"
                      type="email"
                      value={formData.adminEmail}
                      onChange={handleInputChange}
                      placeholder="admin@school.com"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Admin Phone
                  </label>
                  <Input
                    name="adminPhone"
                    value={formData.adminPhone}
                    onChange={handleInputChange}
                    placeholder="Phone number"
                    disabled={loading}
                  />
                </div>

                <Button
                  onClick={handleNextStep}
                  disabled={loading}
                  className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
                >
                  Next: Choose Plan
                </Button>
              </div>
            )}

            {/* Step 2: Plan Selection */}
            {step === "plan" && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Your Plan</h3>
                  <p className="text-sm text-slate-600 mb-6">
                    Choose the best plan for your school
                  </p>
                </div>

                <div className="flex justify-center mb-6">
                  <PricingInteraction
                    starterMonth={9.99}
                    starterAnnual={7.49}
                    proMonth={19.99}
                    proAnnual={17.49}
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-700">
                    <strong>Selected Plan:</strong> {formData.subscriptionPlan}
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => setStep("details")}
                    variant="outline"
                    className="flex-1"
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {step === "success" && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Registration Successful!</h2>
                  <p className="text-slate-600 mt-2">{successMessage}</p>
                </div>

                {/* Admin Credentials Box */}
                {successData && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-900">Admin Login Credentials</h3>
                      <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded">Save These</span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600">Email Address</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            readOnly
                            value={successData.adminEmail}
                            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(successData.adminEmail);
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600">Generated Password</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            readOnly
                            value={successData.adminPassword || ""}
                            className="flex-1 px-3 py-2 bg-white border border-red-300 rounded text-sm font-mono"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(successData.adminPassword);
                              setCopiedPassword(true);
                              setTimeout(() => setCopiedPassword(false), 2000);
                            }}
                          >
                            {copiedPassword ? "✓" : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-600">Login URL</label>
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            readOnly
                            value="http://localhost:8081/school-admin-login"
                            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText("http://localhost:8081/school-admin-login");
                            }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800">
                      ⚠️ <strong>Important:</strong> Make sure to save these credentials. This password will also be sent to your email.
                    </div>
                  </div>
                )}

                {/* Assigned Modules */}
                {successData?.modules && successData.modules.length > 0 && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
                    <h3 className="font-bold text-slate-900 mb-4">
                      Modules Included in Your {successData.subscriptionPlan} Plan
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {successData.modules.map((module) => (
                        <div key={module} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                          <span className="text-sm text-slate-700">{module}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-700">
                    <strong>Next Steps:</strong>
                  </p>
                  <ol className="text-sm text-slate-600 mt-2 space-y-1 ml-4 list-decimal">
                    <li>Use the credentials above to login to your admin dashboard</li>
                    <li>Change your password after first login</li>
                    <li>Start adding students, staff, and managing your school</li>
                  </ol>
                </div>

                <p className="text-sm text-slate-500 text-center">Redirecting to home page in 7 seconds...</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-600">
            Already have an account?{" "}
            <a href="/school-admin-login" className="text-blue-600 hover:underline font-semibold">
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
