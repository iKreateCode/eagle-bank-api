import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma";
import { createUserId } from "../lib/id";
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from "../schemas/user-schema";

function formatZodErrors(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "unknown",
    message: issue.message,
    type: issue.code,
  }));
}

/**
 * Serialises a Prisma user record into the spec's UserResponse shape.
 * Keeps the response mapping in one place so all handlers stay consistent.
 */
function toUserResponse(user: {
  id: string;
  name: string;
  address: unknown;
  phoneNumber: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    address: user.address,
    phoneNumber: user.phoneNumber,
    email: user.email,
    createdTimestamp: user.createdAt,
    updatedTimestamp: user.updatedAt,
  };
}

export async function createUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const bodyResult = createUserSchema.safeParse(req.body);

    if (!bodyResult.success) {
      return res.status(400).json({
        message: "Invalid request body",
        details: formatZodErrors(bodyResult.error),
      });
    }

    const { name, address, phoneNumber, email, password } = bodyResult.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(400).json({
        message: "A user with this email already exists",
        details: [
          {
            field: "email",
            message: "A user with this email already exists",
            type: "conflict",
          },
        ],
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        id: createUserId(),
        name,
        address,
        phoneNumber,
        email,
        passwordHash,
      },
    });

    return res.status(201).json(toUserResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function getUserById(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const paramsResult = userIdParamSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        message: "The request didn't supply all the necessary data",
        details: formatZodErrors(paramsResult.error),
      });
    }

    const { userId } = paramsResult.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "User was not found" });
    }

    if (req.user?.userId !== userId) {
      return res.status(403).json({
        message: "The user is not allowed to access this resource",
      });
    }

    return res.status(200).json(toUserResponse(user));
  } catch (error) {
    next(error);
  }
}

export async function updateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const paramsResult = userIdParamSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        message: "Invalid user ID",
        details: formatZodErrors(paramsResult.error),
      });
    }

    const bodyResult = updateUserSchema.safeParse(req.body);

    if (!bodyResult.success) {
      return res.status(400).json({
        message: "Invalid request body",
        details: formatZodErrors(bodyResult.error),
      });
    }

    const { userId } = paramsResult.data;

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!existingUser) {
      return res.status(404).json({ message: "User was not found" });
    }

    if (req.user?.userId !== userId) {
      return res.status(403).json({
        message: "The user is not allowed to access this resource",
      });
    }

    const { name, address, phoneNumber, email } = bodyResult.data;

    if (email !== undefined && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });

      if (emailTaken) {
        return res.status(400).json({
          message: "A user with this email already exists",
          details: [
            {
              field: "email",
              message: "A user with this email already exists",
              type: "conflict",
            },
          ],
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(address !== undefined && { address }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(email !== undefined && { email }),
      },
    });

    return res.status(200).json(toUserResponse(updatedUser));
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const paramsResult = userIdParamSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        message: "Invalid user ID",
        details: formatZodErrors(paramsResult.error),
      });
    }

    const { userId } = paramsResult.data;

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User was not found" });
    }

    if (req.user?.userId !== userId) {
      return res.status(403).json({
        message: "The user is not allowed to delete this resource",
      });
    }

    if (existingUser.accounts.length > 0) {
      return res.status(409).json({
        message: "User cannot be deleted while they have bank accounts",
      });
    }

    await prisma.user.delete({ where: { id: userId } });

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}