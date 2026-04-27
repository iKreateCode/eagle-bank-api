import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { prisma } from "../lib/prisma";
import { createAccountNumber } from "../lib/id";
import {
  createAccountSchema,
  updateAccountSchema,
  accountNumberParamSchema,
} from "../schemas/account-schema";

function formatZodErrors(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "unknown",
    message: issue.message,
    type: issue.code,
  }));
}

function toAccountResponse(account: {
  accountNumber: string;
  sortCode: string;
  name: string;
  accountType: string;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    accountNumber: account.accountNumber,
    sortCode: account.sortCode,
    name: account.name,
    accountType: account.accountType,
    balance: account.balance,
    currency: account.currency,
    createdTimestamp: account.createdAt,
    updatedTimestamp: account.updatedAt,
  };
}

export async function createAccount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const bodyResult = createAccountSchema.safeParse(req.body);

    if (!bodyResult.success) {
      return res.status(400).json({
        message: "Invalid request body",
        details: formatZodErrors(bodyResult.error),
      });
    }

    const { name, accountType } = bodyResult.data;
    const userId = req.user!.userId;

    let accountNumber: string;
    let attempts = 0;
    do {
      accountNumber = createAccountNumber();
      attempts++;
      const existing = await prisma.bankAccount.findUnique({
        where: { accountNumber },
      });
      if (!existing) break;
    } while (attempts < 10);

    const account = await prisma.bankAccount.create({
      data: { accountNumber, name, accountType, userId },
    });

    return res.status(201).json(toAccountResponse(account));
  } catch (error) {
    next(error);
  }
}

export async function listAccounts(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user!.userId;

    const accounts = await prisma.bankAccount.findMany({ where: { userId } });

    return res.status(200).json({ accounts: accounts.map(toAccountResponse) });
  } catch (error) {
    next(error);
  }
}

export async function getAccountByNumber(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const paramsResult = accountNumberParamSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        message: "The request didn't supply all the necessary data",
        details: formatZodErrors(paramsResult.error),
      });
    }

    const { accountNumber } = paramsResult.data;

    const account = await prisma.bankAccount.findUnique({
      where: { accountNumber },
    });

    if (!account) {
      return res.status(404).json({ message: "Bank account was not found" });
    }

    if (account.userId !== req.user!.userId) {
      return res.status(403).json({
        message: "The user is not allowed to access this bank account",
      });
    }

    return res.status(200).json(toAccountResponse(account));
  } catch (error) {
    next(error);
  }
}

export async function updateAccount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const paramsResult = accountNumberParamSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        message: "The request didn't supply all the necessary data",
        details: formatZodErrors(paramsResult.error),
      });
    }

    const bodyResult = updateAccountSchema.safeParse(req.body);

    if (!bodyResult.success) {
      return res.status(400).json({
        message: "Invalid request body",
        details: formatZodErrors(bodyResult.error),
      });
    }

    const { accountNumber } = paramsResult.data;

    const existing = await prisma.bankAccount.findUnique({
      where: { accountNumber },
    });

    if (!existing) {
      return res.status(404).json({ message: "Bank account was not found" });
    }

    if (existing.userId !== req.user!.userId) {
      return res.status(403).json({
        message: "The user is not allowed to update this bank account",
      });
    }

    const { name, accountType } = bodyResult.data;

    const updated = await prisma.bankAccount.update({
      where: { accountNumber },
      data: {
        ...(name !== undefined && { name }),
        ...(accountType !== undefined && { accountType }),
      },
    });

    return res.status(200).json(toAccountResponse(updated));
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const paramsResult = accountNumberParamSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        message: "The request didn't supply all the necessary data",
        details: formatZodErrors(paramsResult.error),
      });
    }

    const { accountNumber } = paramsResult.data;

    const existing = await prisma.bankAccount.findUnique({
      where: { accountNumber },
    });

    if (!existing) {
      return res.status(404).json({ message: "Bank account was not found" });
    }

    if (existing.userId !== req.user!.userId) {
      return res.status(403).json({
        message: "The user is not allowed to delete this bank account",
      });
    }

    await prisma.bankAccount.delete({ where: { accountNumber } });

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}
