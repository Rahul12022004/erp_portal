import express, { Request, Response } from "express";
import mongoose from "mongoose";
import BankingWorkspace from "../models/BankingWorkspace";

const router = express.Router();

type CurrencyCode = "INR" | "USD" | "EUR";
type AccountType = "Current" | "Savings" | "Escrow";
type AccountStatus = "Active" | "Dormant" | "Closed";
type TransactionType = "credit" | "debit";
type TransactionStatus = "paid" | "pending" | "overdue";
type LoanType = "taken" | "given";
type LoanStatus = "active" | "pending" | "closed";
type AssetStatus = "active" | "in-use" | "under-maintenance" | "retired" | "disposed";
type DepreciationMethod = "straight-line" | "declining-balance";

type LooseRecord = Record<string, unknown>;

const getSingleString = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return "";
};

const toNumber = (value: unknown) => Number(value || 0);
const toStringValue = (value: unknown) => String(value || "");
const roundCurrency = (value: number) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
const asRecord = (value: unknown): LooseRecord | null =>
  value && typeof value === "object" ? (value as LooseRecord) : null;

const allowedAccountTypes = new Set<AccountType>(["Current", "Savings", "Escrow"]);
const allowedCurrencies = new Set<CurrencyCode>(["INR", "USD", "EUR"]);
const allowedAccountStatuses = new Set<AccountStatus>(["Active", "Dormant", "Closed"]);
const allowedTransactionTypes = new Set<TransactionType>(["credit", "debit"]);
const allowedTransactionStatuses = new Set<TransactionStatus>(["paid", "pending", "overdue"]);
const allowedLoanTypes = new Set<LoanType>(["taken", "given"]);
const allowedLoanStatuses = new Set<LoanStatus>(["active", "pending", "closed"]);
const allowedAssetStatuses = new Set<AssetStatus>(["active", "in-use", "under-maintenance", "retired", "disposed"]);
const allowedDepreciationMethods = new Set<DepreciationMethod>(["straight-line", "declining-balance"]);

const ensureSchoolId = (schoolId: string) => {
  if (!schoolId || !mongoose.Types.ObjectId.isValid(schoolId)) {
    throw new Error("Invalid schoolId");
  }

  return new mongoose.Types.ObjectId(schoolId);
};

const getNextCode = (prefix: string, values: string[]) => {
  const maxSuffix = values.reduce((maxValue, currentValue) => {
    const match = currentValue.match(new RegExp(`^${prefix}-(\\d+)$`));
    if (!match) {
      return maxValue;
    }

    const numericValue = Number.parseInt(match[1], 10);
    return Number.isFinite(numericValue) ? Math.max(maxValue, numericValue) : maxValue;
  }, 0);

  return `${prefix}-${String(maxSuffix + 1).padStart(3, "0")}`;
};

const getTodayYMD = () => new Date().toISOString().slice(0, 10);

const getTransactionReference = (count: number) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `TXN-${y}${m}${d}-${String(count + 1).padStart(3, "0")}`;
};

const getLoanReference = (count: number) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `LOAN-${y}${m}-${String(count + 1).padStart(3, "0")}`;
};

const computeAssetMetrics = (asset: {
  purchaseValue: number;
  purchaseDate: string;
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
}) => {
  const now = new Date();
  const purchase = new Date(asset.purchaseDate);
  const elapsedYears = Math.max(0, (now.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24 * 365));
  const fullYears = Math.max(0, Math.floor(elapsedYears));

  if (asset.depreciationMethod === "straight-line") {
    const annual = asset.purchaseValue / Math.max(asset.usefulLifeYears, 1);
    const accumulated = Math.min(asset.purchaseValue, annual * elapsedYears);
    return {
      annualDepreciation: roundCurrency(annual),
      currentBookValue: roundCurrency(Math.max(0, asset.purchaseValue - accumulated)),
      depreciationPercentage: Math.min(100, (accumulated / Math.max(asset.purchaseValue, 1)) * 100),
    };
  }

  const rate = 1 / Math.max(asset.usefulLifeYears, 1);
  const currentBookValue = asset.purchaseValue * Math.pow(1 - rate, fullYears);
  const annualDepreciation = currentBookValue * rate;
  const accumulated = asset.purchaseValue - currentBookValue;

  return {
    annualDepreciation: roundCurrency(annualDepreciation),
    currentBookValue: roundCurrency(Math.max(0, currentBookValue)),
    depreciationPercentage: Math.min(100, (accumulated / Math.max(asset.purchaseValue, 1)) * 100),
  };
};

const getWorkspace = async (schoolId: string) => {
  const schoolObjectId = ensureSchoolId(schoolId);
  let workspace = await BankingWorkspace.findOne({ schoolId: schoolObjectId });

  if (!workspace) {
    workspace = await BankingWorkspace.create({ schoolId: schoolObjectId });
  }

  return workspace;
};

const serializeWorkspace = (workspace: unknown) => {
  const record = asRecord((workspace as { toObject?: () => unknown })?.toObject?.() || workspace) || {};
  const accounts = Array.isArray(record.accounts) ? record.accounts : [];
  const transactions = Array.isArray(record.transactions) ? record.transactions : [];
  const loans = Array.isArray(record.loans) ? record.loans : [];
  const assets = Array.isArray(record.assets) ? record.assets : [];

  const accountBalances = new Map<string, number>();
  accounts.forEach((account) => {
    const accountRecord = asRecord(account) || {};
    accountBalances.set(
      toStringValue(accountRecord.id),
      roundCurrency(toNumber(accountRecord.openingBalance))
    );
  });

  transactions.forEach((transaction) => {
    const txnRecord = asRecord(transaction) || {};
    const accountId = toStringValue(txnRecord.accountId);
    const amount = roundCurrency(toNumber(txnRecord.amount));
    const delta = txnRecord.type === "credit" ? amount : -amount;
    accountBalances.set(accountId, roundCurrency((accountBalances.get(accountId) || 0) + delta));
  });

  const serializedAccounts = accounts.map((account) => {
    const accountRecord = asRecord(account) || {};
    const accountId = toStringValue(accountRecord.id);
    return {
      id: accountId,
      bankName: toStringValue(accountRecord.bankName),
      accountType: toStringValue(accountRecord.accountType || "Current"),
      accountNumber: toStringValue(accountRecord.accountNumber),
      swift: toStringValue(accountRecord.swift),
      currency: toStringValue(accountRecord.currency || "INR"),
      openingBalance: roundCurrency(toNumber(accountRecord.openingBalance)),
      currentBalance: roundCurrency(accountBalances.get(accountId) || 0),
      internalReference: toStringValue(accountRecord.internalReference),
      status: toStringValue(accountRecord.status || "Active"),
    };
  });

  const serializedTransactions = transactions
    .map((transaction) => {
      const txnRecord = asRecord(transaction) || {};
      return {
        id: toStringValue(txnRecord.id),
        referenceNo: toStringValue(txnRecord.referenceNo),
        date: toStringValue(txnRecord.date),
        description: toStringValue(txnRecord.description),
        accountId: toStringValue(txnRecord.accountId),
        type: toStringValue(txnRecord.type),
        amount: roundCurrency(toNumber(txnRecord.amount)),
        status: toStringValue(txnRecord.status || "paid"),
      };
    })
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());

  const serializedLoans = loans
    .map((loan) => {
      const loanRecord = asRecord(loan) || {};
      return {
        id: toStringValue(loanRecord.id),
        referenceNo: toStringValue(loanRecord.referenceNo),
        loanType: toStringValue(loanRecord.loanType),
        partyName: toStringValue(loanRecord.partyName),
        principalAmount: roundCurrency(toNumber(loanRecord.principalAmount)),
        interestRate: roundCurrency(toNumber(loanRecord.interestRate)),
        startDate: toStringValue(loanRecord.startDate),
        dueDate: toStringValue(loanRecord.dueDate),
        outstandingAmount: roundCurrency(toNumber(loanRecord.outstandingAmount)),
        status: toStringValue(loanRecord.status || "active"),
      };
    })
    .sort((left, right) => new Date(right.startDate).getTime() - new Date(left.startDate).getTime());

  const serializedAssets = assets
    .map((asset) => {
      const assetRecord = asRecord(asset) || {};
      return {
        id: toStringValue(assetRecord.id),
        assetName: toStringValue(assetRecord.assetName),
        category: toStringValue(assetRecord.category),
        vendor: toStringValue(assetRecord.vendor),
        purchaseValue: roundCurrency(toNumber(assetRecord.purchaseValue)),
        purchaseDate: toStringValue(assetRecord.purchaseDate),
        usefulLifeYears: Math.max(1, Math.floor(toNumber(assetRecord.usefulLifeYears))),
        depreciationMethod: toStringValue(assetRecord.depreciationMethod || "straight-line"),
        location: toStringValue(assetRecord.location),
        department: toStringValue(assetRecord.department),
        status: toStringValue(assetRecord.status || "active"),
        notes: toStringValue(assetRecord.notes),
      };
    })
    .sort((left, right) => new Date(right.purchaseDate).getTime() - new Date(left.purchaseDate).getTime());

  const totalBalance = serializedAccounts.reduce((sum, account) => sum + account.currentBalance, 0);
  const thisMonthInflow = serializedTransactions
    .filter((transaction) => {
      const now = new Date();
      const date = new Date(transaction.date);
      return transaction.type === "credit" && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const loansOutstanding = serializedLoans
    .filter((loan) => loan.status !== "closed")
    .reduce((sum, loan) => sum + loan.outstandingAmount, 0);
  const credits = serializedTransactions
    .filter((transaction) => transaction.type === "credit")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const debits = serializedTransactions
    .filter((transaction) => transaction.type === "debit")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const takenOutstanding = serializedLoans
    .filter((loan) => loan.loanType === "taken")
    .reduce((sum, loan) => sum + loan.outstandingAmount, 0);
  const givenOutstanding = serializedLoans
    .filter((loan) => loan.loanType === "given")
    .reduce((sum, loan) => sum + loan.outstandingAmount, 0);
  const assetPurchaseValue = serializedAssets.reduce((sum, asset) => sum + asset.purchaseValue, 0);
  const assetBookValue = serializedAssets.reduce(
    (sum, asset) => sum + computeAssetMetrics(asset as never).currentBookValue,
    0
  );

  return {
    accounts: serializedAccounts,
    transactions: serializedTransactions,
    loans: serializedLoans,
    assets: serializedAssets,
    summary: {
      totalBalance: roundCurrency(totalBalance),
      activeAccounts: serializedAccounts.filter((account) => account.status === "Active").length,
      thisMonthInflow: roundCurrency(thisMonthInflow),
      loansOutstanding: roundCurrency(loansOutstanding),
      transactionTotals: {
        credits: roundCurrency(credits),
        debits: roundCurrency(debits),
        net: roundCurrency(credits - debits),
        pending: serializedTransactions.filter((transaction) => transaction.status === "pending").length,
      },
      loanOverview: {
        takenOutstanding: roundCurrency(takenOutstanding),
        givenOutstanding: roundCurrency(givenOutstanding),
        netPosition: roundCurrency(givenOutstanding - takenOutstanding),
        totalRecords: serializedLoans.length,
      },
      assetOverview: {
        purchaseValue: roundCurrency(assetPurchaseValue),
        bookValue: roundCurrency(assetBookValue),
        accumulatedDepreciation: roundCurrency(assetPurchaseValue - assetBookValue),
        count: serializedAssets.length,
      },
    },
  };
};

router.get("/:schoolId", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const workspace = await getWorkspace(schoolId);

    return res.json({
      success: true,
      data: serializeWorkspace(workspace),
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to load banking workspace",
    });
  }
});

router.post("/:schoolId/accounts", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const workspace = await getWorkspace(schoolId);
    const bankName = getSingleString(req.body.bankName).trim();
    const accountNumber = getSingleString(req.body.accountNumber).trim();
    const internalReference = getSingleString(req.body.internalReference).trim();
    const accountType = getSingleString(req.body.accountType) as AccountType;
    const currency = getSingleString(req.body.currency) as CurrencyCode;
    const status = getSingleString(req.body.status) as AccountStatus;

    if (!bankName || !accountNumber || !internalReference) {
      return res.status(400).json({ message: "bankName, accountNumber, and internalReference are required" });
    }

    if (!allowedAccountTypes.has(accountType) || !allowedCurrencies.has(currency) || !allowedAccountStatuses.has(status)) {
      return res.status(400).json({ message: "Invalid account metadata" });
    }

    const existingIds = (workspace.accounts || []).map((account) => toStringValue(account.id));
    workspace.accounts.unshift({
      id: getNextCode("ACC", existingIds),
      bankName,
      accountType,
      accountNumber,
      swift: getSingleString(req.body.swift).trim(),
      currency,
      openingBalance: Math.max(roundCurrency(toNumber(req.body.openingBalance)), 0),
      internalReference,
      status,
    } as never);
    await workspace.save();

    return res.status(201).json({
      success: true,
      data: serializeWorkspace(workspace),
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to save bank account",
    });
  }
});

router.post("/:schoolId/transactions", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const workspace = await getWorkspace(schoolId);
    const accountId = getSingleString(req.body.accountId).trim();
    const description = getSingleString(req.body.description).trim();
    const type = getSingleString(req.body.type) as TransactionType;
    const status = getSingleString(req.body.status) as TransactionStatus;
    const amount = Math.max(roundCurrency(toNumber(req.body.amount)), 0);

    if (!accountId || !description || amount <= 0) {
      return res.status(400).json({ message: "accountId, description, and valid amount are required" });
    }

    if (!allowedTransactionTypes.has(type) || !allowedTransactionStatuses.has(status)) {
      return res.status(400).json({ message: "Invalid transaction metadata" });
    }

    const accountExists = (workspace.accounts || []).some((account) => toStringValue(account.id) === accountId);
    if (!accountExists) {
      return res.status(404).json({ message: "Bank account not found" });
    }

    workspace.transactions.unshift({
      id: `TX-${Date.now()}`,
      referenceNo: getTransactionReference((workspace.transactions || []).length),
      date: getSingleString(req.body.date).trim() || getTodayYMD(),
      description,
      accountId,
      type,
      amount,
      status,
    } as never);
    await workspace.save();

    return res.status(201).json({
      success: true,
      data: serializeWorkspace(workspace),
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to save transaction",
    });
  }
});

router.delete("/:schoolId/transactions/:transactionId", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const transactionId = getSingleString(req.params.transactionId).trim();
    const workspace = await getWorkspace(schoolId);
    const nextTransactions = (workspace.transactions || []).filter((transaction) => toStringValue(transaction.id) !== transactionId);

    if (nextTransactions.length === (workspace.transactions || []).length) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    workspace.transactions = nextTransactions as never;
    await workspace.save();

    return res.json({
      success: true,
      data: serializeWorkspace(workspace),
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to delete transaction",
    });
  }
});

router.post("/:schoolId/loans", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const workspace = await getWorkspace(schoolId);
    const partyName = getSingleString(req.body.partyName).trim();
    const loanType = getSingleString(req.body.loanType) as LoanType;
    const status = getSingleString(req.body.status) as LoanStatus;
    const principalAmount = Math.max(roundCurrency(toNumber(req.body.principalAmount)), 0);
    const outstandingAmount = Math.max(roundCurrency(toNumber(req.body.outstandingAmount)), 0);

    if (!partyName || principalAmount <= 0) {
      return res.status(400).json({ message: "partyName and valid principalAmount are required" });
    }

    if (!allowedLoanTypes.has(loanType) || !allowedLoanStatuses.has(status)) {
      return res.status(400).json({ message: "Invalid loan metadata" });
    }

    workspace.loans.unshift({
      id: `LO-${Date.now()}`,
      referenceNo: getLoanReference((workspace.loans || []).length),
      loanType,
      partyName,
      principalAmount,
      interestRate: Math.max(roundCurrency(toNumber(req.body.interestRate)), 0),
      startDate: getSingleString(req.body.startDate).trim() || getTodayYMD(),
      dueDate: getSingleString(req.body.dueDate).trim() || getTodayYMD(),
      outstandingAmount,
      status,
    } as never);
    await workspace.save();

    return res.status(201).json({
      success: true,
      data: serializeWorkspace(workspace),
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to save loan",
    });
  }
});

router.post("/:schoolId/assets", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const workspace = await getWorkspace(schoolId);
    const assetName = getSingleString(req.body.assetName).trim();
    const category = getSingleString(req.body.category).trim();
    const depreciationMethod = getSingleString(req.body.depreciationMethod) as DepreciationMethod;
    const status = getSingleString(req.body.status) as AssetStatus;
    const purchaseValue = Math.max(roundCurrency(toNumber(req.body.purchaseValue)), 0);
    const usefulLifeYears = Math.max(Math.floor(toNumber(req.body.usefulLifeYears)), 1);

    if (!assetName || !category || purchaseValue <= 0) {
      return res.status(400).json({ message: "assetName, category, and valid purchaseValue are required" });
    }

    if (!allowedDepreciationMethods.has(depreciationMethod) || !allowedAssetStatuses.has(status)) {
      return res.status(400).json({ message: "Invalid asset metadata" });
    }

    const requestedId = getSingleString(req.body.id).trim();
    const generatedId = getNextCode("AST", (workspace.assets || []).map((asset) => toStringValue(asset.id)));

    workspace.assets.unshift({
      id: requestedId || generatedId,
      assetName,
      category,
      vendor: getSingleString(req.body.vendor).trim(),
      purchaseValue,
      purchaseDate: getSingleString(req.body.purchaseDate).trim() || getTodayYMD(),
      usefulLifeYears,
      depreciationMethod,
      location: getSingleString(req.body.location).trim(),
      department: getSingleString(req.body.department).trim(),
      status,
      notes: getSingleString(req.body.notes).trim(),
    } as never);
    await workspace.save();

    return res.status(201).json({
      success: true,
      data: serializeWorkspace(workspace),
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to save asset",
    });
  }
});

router.patch("/:schoolId/assets/:assetId", async (req: Request, res: Response) => {
  try {
    const schoolId = getSingleString(req.params.schoolId);
    const assetId = getSingleString(req.params.assetId).trim();
    const workspace = await getWorkspace(schoolId);
    const asset = (workspace.assets || []).find((entry) => toStringValue(entry.id) === assetId);

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    if (req.body.status !== undefined) {
      const nextStatus = getSingleString(req.body.status) as AssetStatus;
      if (!allowedAssetStatuses.has(nextStatus)) {
        return res.status(400).json({ message: "Invalid asset status" });
      }
      asset.status = nextStatus;
    }

    if (req.body.vendor !== undefined) {
      asset.vendor = getSingleString(req.body.vendor).trim();
    }

    if (req.body.location !== undefined) {
      asset.location = getSingleString(req.body.location).trim();
    }

    if (req.body.department !== undefined) {
      asset.department = getSingleString(req.body.department).trim();
    }

    if (req.body.notes !== undefined) {
      asset.notes = getSingleString(req.body.notes).trim();
    }

    await workspace.save();

    return res.json({
      success: true,
      data: serializeWorkspace(workspace),
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to update asset",
    });
  }
});

export default router;
