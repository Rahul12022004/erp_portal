import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Moon,
  Plus,
  Search,
  Sun,
  Trash2,
  Wallet,
  BadgeIndianRupee,
  ShieldCheck,
  TrendingUp,
  Layers,
  FileText,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { readStoredSchoolSession } from "@/lib/auth";

type ThemeMode = "light" | "dark";
type BankingTab = "accounts" | "transactions" | "loans" | "assets" | "summary";
type TransactionType = "credit" | "debit";
type TransactionStatus = "paid" | "pending" | "overdue";
type LoanType = "taken" | "given";
type LoanStatus = "active" | "pending" | "closed";
type DepreciationMethod = "straight-line" | "declining-balance";

type Account = {
  id: string;
  bankName: string;
  accountType: "Current" | "Savings" | "Escrow";
  accountNumber: string;
  swift: string;
  currency: "INR" | "USD" | "EUR";
  openingBalance: number;
  currentBalance: number;
  internalReference: string;
  status: "Active" | "Dormant" | "Closed";
};

type Txn = {
  id: string;
  referenceNo: string;
  date: string;
  description: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
};

type Loan = {
  id: string;
  referenceNo: string;
  loanType: LoanType;
  partyName: string;
  principalAmount: number;
  interestRate: number;
  startDate: string;
  dueDate: string;
  outstandingAmount: number;
  status: LoanStatus;
};

type Asset = {
  id: string;
  assetName: string;
  category: string;
  vendor?: string;
  purchaseValue: number;
  purchaseDate: string;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  location?: string;
  department?: string;
  notes?: string;
  status: "active" | "in-use" | "under-maintenance" | "retired" | "disposed";
};

type Toast = {
  id: number;
  message: string;
  tone: "success" | "danger";
};

type BankingWorkspaceResponse = {
  accounts: Account[];
  transactions: Txn[];
  loans: Loan[];
  assets: Asset[];
  summary: {
    totalBalance: number;
    activeAccounts: number;
    thisMonthInflow: number;
    loansOutstanding: number;
    transactionTotals: {
      credits: number;
      debits: number;
      net: number;
      pending: number;
    };
    loanOverview: {
      takenOutstanding: number;
      givenOutstanding: number;
      netPosition: number;
      totalRecords: number;
    };
    assetOverview: {
      purchaseValue: number;
      bookValue: number;
      accumulatedDepreciation: number;
      count: number;
    };
  };
};

const monoNumberStyle: React.CSSProperties = {
  fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace',
  fontVariantNumeric: "tabular-nums",
};

const navItems: Array<{ key: BankingTab; label: string; icon: React.ElementType }> = [
  { key: "accounts", label: "Accounts", icon: Building2 },
  { key: "transactions", label: "Transactions", icon: Activity },
  { key: "loans", label: "Loans", icon: Landmark },
  { key: "assets", label: "Asset Register", icon: Layers },
  { key: "summary", label: "Banking Summary", icon: FileText },
];

const fmtCurrency = (amount: number, currency: Account["currency"] = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" ? 0 : 2,
  }).format(Number(amount || 0));

const getTodayYMD = () => new Date().toISOString().slice(0, 10);

function computeAssetMetrics(asset: Asset) {
  const now = new Date();
  const purchase = new Date(asset.purchaseDate);
  const elapsedYears = Math.max(0, (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 365));
  const fullYears = Math.max(0, Math.floor(elapsedYears));

  if (asset.depreciationMethod === "straight-line") {
    const annual = asset.purchaseValue / Math.max(asset.usefulLifeYears, 1);
    const accumulated = Math.min(asset.purchaseValue, annual * elapsedYears);
    const book = Math.max(0, asset.purchaseValue - accumulated);
    return {
      annualDepreciation: annual,
      currentBookValue: book,
      depreciationPercentage: Math.min(100, (accumulated / asset.purchaseValue) * 100),
    };
  }

  const rate = 1 / Math.max(asset.usefulLifeYears, 1);
  const currentBookValue = asset.purchaseValue * Math.pow(1 - rate, fullYears);
  const annualDepreciation = currentBookValue * rate;
  const accumulated = asset.purchaseValue - currentBookValue;

  return {
    annualDepreciation,
    currentBookValue: Math.max(0, currentBookValue),
    depreciationPercentage: Math.min(100, (accumulated / asset.purchaseValue) * 100),
  };
}

export default function BankingModule() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [activeTab, setActiveTab] = useState<BankingTab>("accounts");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<BankingWorkspaceResponse["summary"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);

  const [toastList, setToastList] = useState<Toast[]>([]);

  const [txnSearch, setTxnSearch] = useState("");
  const [txnTypeFilter, setTxnTypeFilter] = useState<"all" | TransactionType>("all");
  const [txnStatusFilter, setTxnStatusFilter] = useState<"all" | TransactionStatus>("all");

  const [accountForm, setAccountForm] = useState<Omit<Account, "id">>({
    bankName: "",
    accountType: "Current",
    accountNumber: "",
    swift: "",
    currency: "INR",
    openingBalance: 0,
    currentBalance: 0,
    internalReference: "",
    status: "Active",
  });

  const [txnForm, setTxnForm] = useState<Omit<Txn, "id" | "referenceNo">>({
    date: getTodayYMD(),
    description: "",
    accountId: "",
    type: "credit",
    amount: 0,
    status: "paid",
  });

  const [loanForm, setLoanForm] = useState<Omit<Loan, "id" | "referenceNo">>({
    loanType: "taken",
    partyName: "",
    principalAmount: 0,
    interestRate: 0,
    startDate: getTodayYMD(),
    dueDate: getTodayYMD(),
    outstandingAmount: 0,
    status: "active",
  });

  const [assetForm, setAssetForm] = useState<Asset>({
    id: "",
    assetName: "",
    category: "",
    purchaseValue: 0,
    purchaseDate: getTodayYMD(),
    usefulLifeYears: 5,
    depreciationMethod: "straight-line",
    status: "active",
  });

  const baseSurface = theme === "dark" ? "bg-[#171a1f] text-[#e5e7eb]" : "bg-[#f5f2ea] text-[#1f2937]";
  const cardSurface = theme === "dark" ? "bg-[#20252c] border-[#343c46]" : "bg-[#fdfcf8] border-[#e6dfd3]";
  const mutedText = theme === "dark" ? "text-[#94a3b8]" : "text-[#6b7280]";
  const panelSurface = theme === "dark" ? "bg-[#1b2026] border-[#2d3641]" : "bg-white border-[#ddd5c9]";
  const schoolSession = readStoredSchoolSession();
  const schoolId = String(schoolSession?._id || "");

  const pushToast = (message: string, tone: Toast["tone"]) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToastList((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToastList((prev) => prev.filter((toast) => toast.id !== id));
    }, 2600);
  };

  const syncWorkspaceData = (payload: BankingWorkspaceResponse) => {
    setAccounts(Array.isArray(payload.accounts) ? payload.accounts : []);
    setTransactions(Array.isArray(payload.transactions) ? payload.transactions : []);
    setLoans(Array.isArray(payload.loans) ? payload.loans : []);
    setAssets(Array.isArray(payload.assets) ? payload.assets : []);
    setSummary(payload.summary || null);
  };

  useEffect(() => {
    if (!schoolId) {
      setLoading(false);
      setError("School session not found. Please log in again.");
      return;
    }

    const loadWorkspace = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/api/banking/${schoolId}`);
        const payload = await response.json().catch(() => null) as { data?: BankingWorkspaceResponse; message?: string } | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message || "Failed to load banking data");
        }

        syncWorkspaceData(payload.data);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load banking data");
      } finally {
        setLoading(false);
      }
    };

    void loadWorkspace();
  }, [schoolId]);

  const accountIdPreview = useMemo(() => `ACC-${String(accounts.length + 1).padStart(3, "0")}`, [accounts.length]);

  const txnRefPreview = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `TXN-${y}${m}${d}-${String(transactions.length + 1).padStart(3, "0")}`;
  }, [transactions.length]);

  const loanRefPreview = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `LOAN-${y}${m}-${String(loans.length + 1).padStart(3, "0")}`;
  }, [loans.length]);

  const totalBalance = useMemo(() => accounts.reduce((sum, item) => sum + item.currentBalance, 0), [accounts]);
  const activeAccounts = useMemo(() => accounts.filter((item) => item.status === "Active").length, [accounts]);

  const thisMonthInflow = useMemo(() => {
    const now = new Date();
    return transactions
      .filter((txn) => {
        const date = new Date(txn.date);
        return txn.type === "credit" && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      })
      .reduce((sum, txn) => sum + txn.amount, 0);
  }, [transactions]);

  const loansOutstanding = useMemo(
    () => loans.filter((loan) => loan.status !== "closed").reduce((sum, loan) => sum + loan.outstandingAmount, 0),
    [loans],
  );

  const txnTotals = useMemo(() => {
    const credits = transactions.filter((txn) => txn.type === "credit").reduce((sum, txn) => sum + txn.amount, 0);
    const debits = transactions.filter((txn) => txn.type === "debit").reduce((sum, txn) => sum + txn.amount, 0);
    return {
      credits,
      debits,
      net: credits - debits,
      pending: transactions.filter((txn) => txn.status === "pending").length,
    };
  }, [transactions]);

  const loanOverview = useMemo(() => {
    const takenOutstanding = loans.filter((loan) => loan.loanType === "taken").reduce((sum, loan) => sum + loan.outstandingAmount, 0);
    const givenOutstanding = loans.filter((loan) => loan.loanType === "given").reduce((sum, loan) => sum + loan.outstandingAmount, 0);
    return {
      takenOutstanding,
      givenOutstanding,
      netPosition: givenOutstanding - takenOutstanding,
      totalRecords: loans.length,
    };
  }, [loans]);

  const assetOverview = useMemo(() => {
    const purchaseValue = assets.reduce((sum, asset) => sum + asset.purchaseValue, 0);
    const bookValue = assets.reduce((sum, asset) => sum + computeAssetMetrics(asset).currentBookValue, 0);
    return {
      purchaseValue,
      bookValue,
      accumulatedDepreciation: purchaseValue - bookValue,
      count: assets.length,
    };
  }, [assets]);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((txn) => {
        const matchesSearch =
          txn.referenceNo.toLowerCase().includes(txnSearch.toLowerCase()) ||
          txn.description.toLowerCase().includes(txnSearch.toLowerCase());
        const matchesType = txnTypeFilter === "all" || txn.type === txnTypeFilter;
        const matchesStatus = txnStatusFilter === "all" || txn.status === txnStatusFilter;
        return matchesSearch && matchesType && matchesStatus;
      }),
    [transactions, txnSearch, txnTypeFilter, txnStatusFilter],
  );

  const accountMap = useMemo(() => {
    const map: Record<string, Account> = {};
    accounts.forEach((acc) => {
      map[acc.id] = acc;
    });
    return map;
  }, [accounts]);

  useEffect(() => {
    if (!txnForm.accountId && accounts.length > 0) {
      setTxnForm((prev) => ({ ...prev, accountId: accounts[0].id }));
    }
  }, [accounts, txnForm.accountId]);

  const addAccount = () => {
    if (!schoolId) {
      pushToast("School session not found. Please log in again.", "danger");
      return;
    }

    if (!accountForm.bankName || !accountForm.accountNumber || !accountForm.internalReference) {
      pushToast("Please fill bank name, account number, and internal reference.", "danger");
      return;
    }

    void (async () => {
      try {
        setSaving(true);
        setError("");
        const response = await fetch(`${API_URL}/api/banking/${schoolId}/accounts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(accountForm),
        });
        const payload = await response.json().catch(() => null) as { data?: BankingWorkspaceResponse; message?: string } | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message || "Failed to create bank account");
        }

        syncWorkspaceData(payload.data);
        setAccountForm({
          bankName: "",
          accountType: "Current",
          accountNumber: "",
          swift: "",
          currency: "INR",
          openingBalance: 0,
          currentBalance: 0,
          internalReference: "",
          status: "Active",
        });
        setShowAccountModal(false);
        pushToast("Bank account created successfully.", "success");
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : "Failed to create bank account";
        setError(message);
        pushToast(message, "danger");
      } finally {
        setSaving(false);
      }
    })();
  };

  const addTransaction = () => {
    if (!schoolId) {
      pushToast("School session not found. Please log in again.", "danger");
      return;
    }

    if (!txnForm.accountId || !txnForm.description || txnForm.amount <= 0) {
      pushToast("Please enter account, description, and a valid amount.", "danger");
      return;
    }

    void (async () => {
      try {
        setSaving(true);
        setError("");
        const response = await fetch(`${API_URL}/api/banking/${schoolId}/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...txnForm,
            amount: Number(txnForm.amount),
          }),
        });
        const payload = await response.json().catch(() => null) as { data?: BankingWorkspaceResponse; message?: string } | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message || "Failed to save transaction");
        }

        syncWorkspaceData(payload.data);
        setTxnForm({
          date: getTodayYMD(),
          description: "",
          accountId: payload.data.accounts[0]?.id ?? "",
          type: "credit",
          amount: 0,
          status: "paid",
        });
        setShowTxnModal(false);
        pushToast("Transaction recorded successfully.", "success");
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : "Failed to save transaction";
        setError(message);
        pushToast(message, "danger");
      } finally {
        setSaving(false);
      }
    })();
  };

  const deleteTransaction = (txn: Txn) => {
    if (!schoolId) {
      pushToast("School session not found. Please log in again.", "danger");
      return;
    }

    void (async () => {
      try {
        setSaving(true);
        setError("");
        const response = await fetch(`${API_URL}/api/banking/${schoolId}/transactions/${txn.id}`, {
          method: "DELETE",
        });
        const payload = await response.json().catch(() => null) as { data?: BankingWorkspaceResponse; message?: string } | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message || "Failed to delete transaction");
        }

        syncWorkspaceData(payload.data);
        pushToast(`Transaction ${txn.referenceNo} deleted.`, "success");
      } catch (deleteError) {
        const message = deleteError instanceof Error ? deleteError.message : "Failed to delete transaction";
        setError(message);
        pushToast(message, "danger");
      } finally {
        setSaving(false);
      }
    })();
  };

  const addLoan = () => {
    if (!schoolId) {
      pushToast("School session not found. Please log in again.", "danger");
      return;
    }

    if (!loanForm.partyName || loanForm.principalAmount <= 0 || loanForm.outstandingAmount < 0) {
      pushToast("Please enter party name and valid loan amounts.", "danger");
      return;
    }

    void (async () => {
      try {
        setSaving(true);
        setError("");
        const response = await fetch(`${API_URL}/api/banking/${schoolId}/loans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(loanForm),
        });
        const payload = await response.json().catch(() => null) as { data?: BankingWorkspaceResponse; message?: string } | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message || "Failed to save loan");
        }

        syncWorkspaceData(payload.data);
        setLoanForm({
          loanType: "taken",
          partyName: "",
          principalAmount: 0,
          interestRate: 0,
          startDate: getTodayYMD(),
          dueDate: getTodayYMD(),
          outstandingAmount: 0,
          status: "active",
        });
        setShowLoanModal(false);
        pushToast("Loan saved successfully.", "success");
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : "Failed to save loan";
        setError(message);
        pushToast(message, "danger");
      } finally {
        setSaving(false);
      }
    })();
  };

  const addAsset = () => {
    if (!schoolId) {
      pushToast("School session not found. Please log in again.", "danger");
      return;
    }

    if (!assetForm.assetName || !assetForm.category || assetForm.purchaseValue <= 0) {
      pushToast("Please enter asset name, category, and purchase value.", "danger");
      return;
    }

    void (async () => {
      try {
        setSaving(true);
        setError("");
        const response = await fetch(`${API_URL}/api/banking/${schoolId}/assets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assetForm),
        });
        const payload = await response.json().catch(() => null) as { data?: BankingWorkspaceResponse; message?: string } | null;

        if (!response.ok || !payload?.data) {
          throw new Error(payload?.message || "Failed to save asset");
        }

        syncWorkspaceData(payload.data);
        setAssetForm({
          id: "",
          assetName: "",
          category: "",
          purchaseValue: 0,
          purchaseDate: getTodayYMD(),
          usefulLifeYears: 5,
          depreciationMethod: "straight-line",
          status: "active",
        });
        setShowAssetModal(false);
        pushToast("Asset added to register.", "success");
      } catch (saveError) {
        const message = saveError instanceof Error ? saveError.message : "Failed to save asset";
        setError(message);
        pushToast(message, "danger");
      } finally {
        setSaving(false);
      }
    })();
  };

  return (
    <section className={`relative overflow-hidden rounded-[24px] border ${panelSurface} shadow-sm`}>
      <div className={`grid min-h-[840px] md:grid-cols-[240px_minmax(0,1fr)] ${baseSurface}`}>
        <aside className={`sticky top-0 h-screen max-h-[840px] border-r px-4 py-5 ${theme === "dark" ? "border-[#2c3440] bg-[#181d23]" : "border-[#e4dccf] bg-[#f8f5ee]"}`}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-teal-600">School ERP</p>
            <h3 className="mt-2 text-base font-semibold">Banking & Finance</h3>
            <p className={`mt-1 text-xs ${mutedText}`}>Admin control workspace</p>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition ${
                  activeTab === key
                    ? "border-teal-500 bg-teal-50 text-teal-800"
                    : theme === "dark"
                      ? "border-[#313a46] bg-[#232a33] text-[#d1d5db] hover:border-teal-400"
                      : "border-[#e5ddd0] bg-[#fffdfa] text-[#334155] hover:border-teal-400"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className={`sticky top-0 z-20 border-b px-4 py-3 sm:px-5 ${theme === "dark" ? "border-[#2d3641] bg-[#1c2128]/95" : "border-[#e6ddcf] bg-[#f8f5ee]/95"} backdrop-blur`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className={`text-xs ${mutedText}`}>Finance / Banking</p>
                <h2 className="text-lg font-semibold">Banking Module</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" disabled={saving} onClick={() => setShowAccountModal(true)} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60"><Plus className="h-3.5 w-3.5" /> Add Account</button>
                <button type="button" disabled={saving || accounts.length === 0} onClick={() => setShowTxnModal(true)} className="inline-flex items-center gap-1 rounded-lg border border-teal-600 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"><CreditCard className="h-3.5 w-3.5" /> New Transaction</button>
                <button type="button" disabled={saving} onClick={() => setShowLoanModal(true)} className="inline-flex items-center gap-1 rounded-lg border border-teal-600 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"><Landmark className="h-3.5 w-3.5" /> Add Loan</button>
                <button type="button" disabled={saving} onClick={() => setShowAssetModal(true)} className="inline-flex items-center gap-1 rounded-lg border border-teal-600 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-60"><Layers className="h-3.5 w-3.5" /> Add Asset</button>
                <button type="button" onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-semibold ${theme === "dark" ? "border-[#3b4655] text-[#e2e8f0]" : "border-[#d7cebf] text-slate-700"}`}>
                  {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />} {theme === "light" ? "Dark" : "Light"}
                </button>
              </div>
            </div>
          </header>

          <main className="space-y-4 p-4 sm:p-5">
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className={`rounded-xl border border-dashed p-8 text-center text-sm ${mutedText}`}>
                Loading banking data...
              </div>
            ) : (
              <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-xl border p-3 ${cardSurface}`}>
                <p className={`text-[11px] uppercase ${mutedText}`}>Total Balance</p>
                <p className="mt-1 text-lg font-semibold" style={monoNumberStyle}>{fmtCurrency(summary?.totalBalance ?? totalBalance)}</p>
                <p className="mt-1 text-xs text-teal-600">Across all accounts</p>
              </div>
              <div className={`rounded-xl border p-3 ${cardSurface}`}>
                <p className={`text-[11px] uppercase ${mutedText}`}>Active Accounts</p>
                <p className="mt-1 text-lg font-semibold" style={monoNumberStyle}>{summary?.activeAccounts ?? activeAccounts}</p>
                <p className="mt-1 text-xs text-teal-600">Status = Active</p>
              </div>
              <div className={`rounded-xl border p-3 ${cardSurface}`}>
                <p className={`text-[11px] uppercase ${mutedText}`}>This Month Inflow</p>
                <p className="mt-1 text-lg font-semibold" style={monoNumberStyle}>{fmtCurrency(summary?.thisMonthInflow ?? thisMonthInflow)}</p>
                <p className="mt-1 text-xs text-teal-600">Credits this month</p>
              </div>
              <div className={`rounded-xl border p-3 ${cardSurface}`}>
                <p className={`text-[11px] uppercase ${mutedText}`}>Loans Outstanding</p>
                <p className="mt-1 text-lg font-semibold" style={monoNumberStyle}>{fmtCurrency(summary?.loansOutstanding ?? loansOutstanding)}</p>
                <p className="mt-1 text-xs text-teal-600">Taken + given open positions</p>
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              {navItems.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === key
                      ? "bg-teal-600 text-white"
                      : theme === "dark"
                        ? "bg-[#252d37] text-[#cbd5e1] hover:bg-[#2d3743]"
                        : "bg-[#ede6db] text-slate-700 hover:bg-[#e5dccd]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "accounts" && (
              <section className="space-y-3">
                {accounts.length === 0 ? (
                  <div className={`rounded-xl border border-dashed p-8 text-center text-sm ${mutedText}`}>No bank accounts yet. Add your first account.</div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {accounts.map((account) => (
                      <article key={account.id} className={`rounded-xl border p-4 ${cardSurface}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{account.bankName}</p>
                            <p className={`text-xs ${mutedText}`}>{account.accountType} • {account.currency}</p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${account.status === "Active" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`}>
                            {account.status}
                          </span>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                          <div><p className={mutedText}>Account ID</p><p style={monoNumberStyle}>{account.id}</p></div>
                          <div><p className={mutedText}>Account No.</p><p style={monoNumberStyle}>{account.accountNumber}</p></div>
                          <div><p className={mutedText}>SWIFT/BIC</p><p style={monoNumberStyle}>{account.swift || "-"}</p></div>
                          <div><p className={mutedText}>Cost Centre</p><p style={monoNumberStyle}>{account.internalReference}</p></div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-teal-500/20 bg-teal-50/60 p-2 text-xs">
                          <div>
                            <p className="text-teal-700">Opening Balance</p>
                            <p className="font-semibold text-teal-900" style={monoNumberStyle}>{fmtCurrency(account.openingBalance, account.currency)}</p>
                          </div>
                          <div>
                            <p className="text-teal-700">Current Balance</p>
                            <p className="font-semibold text-teal-900" style={monoNumberStyle}>{fmtCurrency(account.currentBalance, account.currency)}</p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === "transactions" && (
              <section className={`rounded-xl border p-3 ${cardSurface}`}>
                <div className="mb-3 grid gap-2 md:grid-cols-[1fr_160px_160px]">
                  <label className="relative">
                    <Search className={`pointer-events-none absolute left-2 top-2.5 h-4 w-4 ${mutedText}`} />
                    <input value={txnSearch} onChange={(e) => setTxnSearch(e.target.value)} placeholder="Search ref or description" className={`h-9 w-full rounded-lg border pl-8 pr-2 text-xs ${theme === "dark" ? "border-[#3a4553] bg-[#232b35]" : "border-[#dfd6c8] bg-white"}`} />
                  </label>
                  <select value={txnTypeFilter} onChange={(e) => setTxnTypeFilter(e.target.value as "all" | TransactionType)} className={`h-9 rounded-lg border px-2 text-xs ${theme === "dark" ? "border-[#3a4553] bg-[#232b35]" : "border-[#dfd6c8] bg-white"}`}>
                    <option value="all">All Types</option>
                    <option value="credit">Credit</option>
                    <option value="debit">Debit</option>
                  </select>
                  <select value={txnStatusFilter} onChange={(e) => setTxnStatusFilter(e.target.value as "all" | TransactionStatus)} className={`h-9 rounded-lg border px-2 text-xs ${theme === "dark" ? "border-[#3a4553] bg-[#232b35]" : "border-[#dfd6c8] bg-white"}`}>
                    <option value="all">All Status</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                {filteredTransactions.length === 0 ? (
                  <div className={`rounded-xl border border-dashed p-8 text-center text-sm ${mutedText}`}>No transactions match your filters.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead className={theme === "dark" ? "bg-[#232c37]" : "bg-[#f0ebe1]"}>
                        <tr>
                          <th className="px-3 py-2">Reference</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Description</th>
                          <th className="px-3 py-2">Account</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2 text-right">Amount</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((txn) => (
                          <tr key={txn.id} className="border-b border-black/10">
                            <td className="px-3 py-2" style={monoNumberStyle}>{txn.referenceNo}</td>
                            <td className="px-3 py-2">{txn.date}</td>
                            <td className="px-3 py-2">{txn.description}</td>
                            <td className="px-3 py-2" style={monoNumberStyle}>{txn.accountId}</td>
                            <td className="px-3 py-2">
                              <span className={`rounded-full px-2 py-0.5 ${txn.type === "credit" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{txn.type}</span>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold" style={monoNumberStyle}>{fmtCurrency(txn.amount, accountMap[txn.accountId]?.currency ?? "INR")}</td>
                            <td className="px-3 py-2">
                              <span className={`rounded-full px-2 py-0.5 ${txn.status === "paid" ? "bg-emerald-100 text-emerald-700" : txn.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>{txn.status}</span>
                            </td>
                            <td className="px-3 py-2">
                              <button type="button" onClick={() => deleteTransaction(txn)} className="inline-flex items-center gap-1 rounded-md border border-rose-300 px-2 py-1 text-rose-700 hover:bg-rose-50">
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeTab === "loans" && (
              <section className="space-y-3">
                {loans.length === 0 ? (
                  <div className={`rounded-xl border border-dashed p-8 text-center text-sm ${mutedText}`}>No loans added yet.</div>
                ) : (
                  <>
                    <div className="grid gap-3 lg:grid-cols-3">
                      {loans.map((loan) => {
                        const progress = Math.min(100, Math.max(0, ((loan.principalAmount - loan.outstandingAmount) / Math.max(loan.principalAmount, 1)) * 100));
                        return (
                          <article key={loan.id} className={`rounded-xl border p-4 ${cardSurface}`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-semibold" style={monoNumberStyle}>{loan.referenceNo}</p>
                                <p className={`text-xs ${mutedText}`}>{loan.partyName}</p>
                              </div>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${loan.loanType === "taken" ? "bg-rose-100 text-rose-700" : "bg-teal-100 text-teal-700"}`}>
                                Loan {loan.loanType}
                              </span>
                            </div>
                            <div className="mt-2 space-y-1 text-xs">
                              <p>Principal: <strong style={monoNumberStyle}>{fmtCurrency(loan.principalAmount)}</strong></p>
                              <p>Outstanding: <strong style={monoNumberStyle}>{fmtCurrency(loan.outstandingAmount)}</strong></p>
                              <p>Interest: <strong style={monoNumberStyle}>{loan.interestRate.toFixed(2)}%</strong></p>
                            </div>
                            <div className="mt-3">
                              <div className="mb-1 flex justify-between text-[11px]"><span className={mutedText}>Repayment progress</span><span style={monoNumberStyle}>{progress.toFixed(0)}%</span></div>
                              <div className="h-2 rounded-full bg-black/10">
                                <div className={`h-2 rounded-full ${loan.loanType === "taken" ? "bg-rose-500" : "bg-teal-600"}`} style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div className={`rounded-xl border p-3 ${cardSurface}`}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide">Loan Schedule</p>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead className={theme === "dark" ? "bg-[#232c37]" : "bg-[#f0ebe1]"}>
                            <tr>
                              <th className="px-3 py-2">Ref</th>
                              <th className="px-3 py-2">Type</th>
                              <th className="px-3 py-2">Party</th>
                              <th className="px-3 py-2">Start</th>
                              <th className="px-3 py-2">Due</th>
                              <th className="px-3 py-2 text-right">Outstanding</th>
                              <th className="px-3 py-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loans.map((loan) => (
                              <tr key={loan.id} className="border-b border-black/10">
                                <td className="px-3 py-2" style={monoNumberStyle}>{loan.referenceNo}</td>
                                <td className="px-3 py-2">
                                  <span className={`rounded-full px-2 py-0.5 ${loan.loanType === "taken" ? "bg-rose-100 text-rose-700" : "bg-teal-100 text-teal-700"}`}>{loan.loanType}</span>
                                </td>
                                <td className="px-3 py-2">{loan.partyName}</td>
                                <td className="px-3 py-2">{loan.startDate}</td>
                                <td className="px-3 py-2">{loan.dueDate}</td>
                                <td className="px-3 py-2 text-right font-semibold" style={monoNumberStyle}>{fmtCurrency(loan.outstandingAmount)}</td>
                                <td className="px-3 py-2">{loan.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </section>
            )}

            {activeTab === "assets" && (
              <section className="space-y-3">
                {assets.length === 0 ? (
                  <div className={`rounded-xl border border-dashed p-8 text-center text-sm ${mutedText}`}>No assets in register yet.</div>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {assets.map((asset) => {
                      const metrics = computeAssetMetrics(asset);
                      return (
                        <article key={asset.id} className={`rounded-xl border p-4 ${cardSurface}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-semibold">{asset.assetName}</p>
                              <p className={`text-xs ${mutedText}`}>{asset.category}</p>
                            </div>
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700" style={monoNumberStyle}>{asset.id}</span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div><p className={mutedText}>Purchase Value</p><p style={monoNumberStyle}>{fmtCurrency(asset.purchaseValue)}</p></div>
                            <div><p className={mutedText}>Purchase Date</p><p style={monoNumberStyle}>{asset.purchaseDate}</p></div>
                            <div><p className={mutedText}>Useful Life</p><p style={monoNumberStyle}>{asset.usefulLifeYears} years</p></div>
                            <div><p className={mutedText}>Method</p><p style={monoNumberStyle}>{asset.depreciationMethod}</p></div>
                            <div><p className={mutedText}>Annual Depreciation</p><p style={monoNumberStyle}>{fmtCurrency(metrics.annualDepreciation)}</p></div>
                            <div><p className={mutedText}>Book Value</p><p style={monoNumberStyle}>{fmtCurrency(metrics.currentBookValue)}</p></div>
                          </div>

                          <div className="mt-3">
                            <div className="mb-1 flex justify-between text-[11px]"><span className={mutedText}>Depreciation</span><span style={monoNumberStyle}>{metrics.depreciationPercentage.toFixed(1)}%</span></div>
                            <div className="h-2 rounded-full bg-black/10">
                              <div className="h-2 rounded-full bg-teal-500" style={{ width: `${metrics.depreciationPercentage}%` }} />
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {activeTab === "summary" && (
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <article className={`rounded-xl border p-4 ${cardSurface}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">Liquidity Overview</p>
                  <div className="mt-2 space-y-1 text-xs">
                    {accounts.map((account) => (
                      <div key={account.id} className="flex items-center justify-between"><span>{account.bankName}</span><strong style={monoNumberStyle}>{fmtCurrency(account.currentBalance, account.currency)}</strong></div>
                    ))}
                  </div>
                </article>

                <article className={`rounded-xl border p-4 ${cardSurface}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">Transaction Summary</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between"><span>Total Credits</span><strong style={monoNumberStyle}>{fmtCurrency(txnTotals.credits)}</strong></div>
                    <div className="flex items-center justify-between"><span>Total Debits</span><strong style={monoNumberStyle}>{fmtCurrency(txnTotals.debits)}</strong></div>
                    <div className="flex items-center justify-between"><span>Net Flow</span><strong style={monoNumberStyle}>{fmtCurrency(txnTotals.net)}</strong></div>
                    <div className="flex items-center justify-between"><span>Pending Transactions</span><strong style={monoNumberStyle}>{txnTotals.pending}</strong></div>
                  </div>
                </article>

                <article className={`rounded-xl border p-4 ${cardSurface}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">Loan Overview</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between"><span>Taken Outstanding</span><strong style={monoNumberStyle}>{fmtCurrency(loanOverview.takenOutstanding)}</strong></div>
                    <div className="flex items-center justify-between"><span>Given Outstanding</span><strong style={monoNumberStyle}>{fmtCurrency(loanOverview.givenOutstanding)}</strong></div>
                    <div className="flex items-center justify-between"><span>Net Position</span><strong style={monoNumberStyle}>{fmtCurrency(loanOverview.netPosition)}</strong></div>
                    <div className="flex items-center justify-between"><span>Total Records</span><strong style={monoNumberStyle}>{loanOverview.totalRecords}</strong></div>
                  </div>
                </article>

                <article className={`rounded-xl border p-4 ${cardSurface}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">Asset Overview</p>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between"><span>Total Purchase Value</span><strong style={monoNumberStyle}>{fmtCurrency(assetOverview.purchaseValue)}</strong></div>
                    <div className="flex items-center justify-between"><span>Total Book Value</span><strong style={monoNumberStyle}>{fmtCurrency(assetOverview.bookValue)}</strong></div>
                    <div className="flex items-center justify-between"><span>Accumulated Depreciation</span><strong style={monoNumberStyle}>{fmtCurrency(assetOverview.accumulatedDepreciation)}</strong></div>
                    <div className="flex items-center justify-between"><span>Registered Assets</span><strong style={monoNumberStyle}>{assetOverview.count}</strong></div>
                  </div>
                </article>

                <article className={`rounded-xl border p-4 ${cardSurface}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide">API / Backend Status</p>
                  <div className="mt-2 rounded-lg border border-emerald-300/40 bg-emerald-50/70 p-3 text-xs text-emerald-700">
                    <p className="inline-flex items-center gap-1 font-semibold"><ShieldCheck className="h-3.5 w-3.5" /> Connected</p>
                    <p className="mt-1">Live banking workspace data is loading from the backend for this school.</p>
                  </div>
                </article>
              </section>
            )}
              </>
            )}
          </main>
        </div>
      </div>

      {showAccountModal && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <div className={`w-full max-w-2xl rounded-2xl border p-4 ${cardSurface}`}>
            <h4 className="text-sm font-semibold">Add Bank Account</h4>
            <p className={`mt-1 text-xs ${mutedText}`}>Auto ID preview: <span style={monoNumberStyle}>{accountIdPreview}</span></p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input placeholder="Bank Name" value={accountForm.bankName} onChange={(e) => setAccountForm((p) => ({ ...p, bankName: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <select value={accountForm.accountType} onChange={(e) => setAccountForm((p) => ({ ...p, accountType: e.target.value as Account["accountType"] }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs"><option>Current</option><option>Savings</option><option>Escrow</option></select>
              <input placeholder="Account Number" value={accountForm.accountNumber} onChange={(e) => setAccountForm((p) => ({ ...p, accountNumber: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input placeholder="SWIFT / BIC" value={accountForm.swift} onChange={(e) => setAccountForm((p) => ({ ...p, swift: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <select value={accountForm.currency} onChange={(e) => setAccountForm((p) => ({ ...p, currency: e.target.value as Account["currency"] }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs"><option>INR</option><option>USD</option><option>EUR</option></select>
              <input type="number" placeholder="Opening Balance" value={accountForm.openingBalance} onChange={(e) => setAccountForm((p) => ({ ...p, openingBalance: Number(e.target.value || 0), currentBalance: Number(e.target.value || 0) }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input placeholder="Internal Ref / Cost Centre" value={accountForm.internalReference} onChange={(e) => setAccountForm((p) => ({ ...p, internalReference: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs sm:col-span-2" />
              <select value={accountForm.status} onChange={(e) => setAccountForm((p) => ({ ...p, status: e.target.value as Account["status"] }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs"><option>Active</option><option>Dormant</option><option>Closed</option></select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={saving} onClick={() => setShowAccountModal(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-60">Cancel</button>
              <button type="button" disabled={saving} onClick={addAccount} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save Account"}</button>
            </div>
          </div>
        </div>
      )}

      {showTxnModal && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <div className={`w-full max-w-2xl rounded-2xl border p-4 ${cardSurface}`}>
            <h4 className="text-sm font-semibold">Add Transaction</h4>
            <p className={`mt-1 text-xs ${mutedText}`}>Reference preview: <span style={monoNumberStyle}>{txnRefPreview}</span></p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select value={txnForm.accountId} onChange={(e) => setTxnForm((p) => ({ ...p, accountId: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs">
                {accounts.map((acc) => <option key={acc.id} value={acc.id}>{acc.id} - {acc.bankName}</option>)}
              </select>
              <select value={txnForm.type} onChange={(e) => setTxnForm((p) => ({ ...p, type: e.target.value as TransactionType }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs"><option value="credit">Credit</option><option value="debit">Debit</option></select>
              <input type="number" placeholder="Amount" value={txnForm.amount} onChange={(e) => setTxnForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input type="date" value={txnForm.date} onChange={(e) => setTxnForm((p) => ({ ...p, date: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input placeholder="Description" value={txnForm.description} onChange={(e) => setTxnForm((p) => ({ ...p, description: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs sm:col-span-2" />
              <select value={txnForm.status} onChange={(e) => setTxnForm((p) => ({ ...p, status: e.target.value as TransactionStatus }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs"><option>paid</option><option>pending</option><option>overdue</option></select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={saving} onClick={() => setShowTxnModal(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-60">Cancel</button>
              <button type="button" disabled={saving} onClick={addTransaction} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save Transaction"}</button>
            </div>
          </div>
        </div>
      )}

      {showLoanModal && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <div className={`w-full max-w-2xl rounded-2xl border p-4 ${cardSurface}`}>
            <h4 className="text-sm font-semibold">Add Loan</h4>
            <p className={`mt-1 text-xs ${mutedText}`}>Reference preview: <span style={monoNumberStyle}>{loanRefPreview}</span></p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select value={loanForm.loanType} onChange={(e) => setLoanForm((p) => ({ ...p, loanType: e.target.value as LoanType }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs"><option value="taken">Loan Taken</option><option value="given">Loan Given</option></select>
              <input placeholder="Party Name" value={loanForm.partyName} onChange={(e) => setLoanForm((p) => ({ ...p, partyName: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input type="number" placeholder="Principal" value={loanForm.principalAmount} onChange={(e) => setLoanForm((p) => ({ ...p, principalAmount: Number(e.target.value || 0) }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input type="number" step="0.01" placeholder="Interest Rate %" value={loanForm.interestRate} onChange={(e) => setLoanForm((p) => ({ ...p, interestRate: Number(e.target.value || 0) }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input type="date" value={loanForm.startDate} onChange={(e) => setLoanForm((p) => ({ ...p, startDate: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input type="date" value={loanForm.dueDate} onChange={(e) => setLoanForm((p) => ({ ...p, dueDate: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input type="number" placeholder="Outstanding" value={loanForm.outstandingAmount} onChange={(e) => setLoanForm((p) => ({ ...p, outstandingAmount: Number(e.target.value || 0) }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <select value={loanForm.status} onChange={(e) => setLoanForm((p) => ({ ...p, status: e.target.value as LoanStatus }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs"><option>active</option><option>pending</option><option>closed</option></select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={saving} onClick={() => setShowLoanModal(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-60">Cancel</button>
              <button type="button" disabled={saving} onClick={addLoan} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save Loan"}</button>
            </div>
          </div>
        </div>
      )}

      {showAssetModal && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4">
          <div className={`w-full max-w-2xl rounded-2xl border p-4 ${cardSurface}`}>
            <h4 className="text-sm font-semibold">Add Asset</h4>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input placeholder="Asset ID (optional)" value={assetForm.id} onChange={(e) => setAssetForm((p) => ({ ...p, id: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input placeholder="Asset Name" value={assetForm.assetName} onChange={(e) => setAssetForm((p) => ({ ...p, assetName: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input placeholder="Category" value={assetForm.category} onChange={(e) => setAssetForm((p) => ({ ...p, category: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input type="number" placeholder="Purchase Value" value={assetForm.purchaseValue} onChange={(e) => setAssetForm((p) => ({ ...p, purchaseValue: Number(e.target.value || 0) }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input type="date" value={assetForm.purchaseDate} onChange={(e) => setAssetForm((p) => ({ ...p, purchaseDate: e.target.value }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <input type="number" min="1" placeholder="Useful Life (years)" value={assetForm.usefulLifeYears} onChange={(e) => setAssetForm((p) => ({ ...p, usefulLifeYears: Number(e.target.value || 1) }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs" />
              <select value={assetForm.depreciationMethod} onChange={(e) => setAssetForm((p) => ({ ...p, depreciationMethod: e.target.value as DepreciationMethod }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs"><option value="straight-line">straight-line</option><option value="declining-balance">declining-balance</option></select>
              <select value={assetForm.status} onChange={(e) => setAssetForm((p) => ({ ...p, status: e.target.value as Asset["status"] }))} className="h-9 rounded-lg border border-[#d9d2c7] px-2 text-xs"><option value="active">active</option><option value="in-use">in-use</option><option value="under-maintenance">under-maintenance</option><option value="retired">retired</option><option value="disposed">disposed</option></select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={saving} onClick={() => setShowAssetModal(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-60">Cancel</button>
              <button type="button" disabled={saving} onClick={addAsset} className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save Asset"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 space-y-2">
        {toastList.map((toast) => (
          <div key={toast.id} className={`rounded-lg px-3 py-2 text-xs font-semibold text-white shadow ${toast.tone === "success" ? "bg-emerald-600" : "bg-rose-600"}`}>
            {toast.message}
          </div>
        ))}
      </div>

      <div className="sr-only">
        <Wallet />
        <CircleDollarSign />
        <BadgeIndianRupee />
        <TrendingUp />
      </div>
    </section>
  );
}
