import {
  users,
  userProfiles,
  monetizationOpportunities,
  messages,
  connections,
  type User,
  type InsertUser,
  type UserProfile,
  type InsertUserProfile,
  type MonetizationOpportunity,
  type InsertMonetizationOpportunity,
  type Message,
  type InsertMessage,
  type Connection,
  type InsertConnection,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import pkg from "pg"; // Import pg as a namespace
const { Pool } = pkg;

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;

  // User profiles
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(
    userId: number,
    data: Partial<InsertUserProfile>,
  ): Promise<UserProfile | undefined>;

  // Monetization opportunities
  saveOpportunity(
    opportunity: InsertMonetizationOpportunity,
  ): Promise<MonetizationOpportunity>;
  getUserOpportunities(userId: number): Promise<MonetizationOpportunity[]>;
  getSharedOpportunities(): Promise<MonetizationOpportunity[]>;

  // Messaging
  sendMessage(message: InsertMessage): Promise<Message>;
  getUserMessages(userId: number): Promise<Message[]>;
  markMessageAsRead(messageId: number): Promise<void>;

  // Connections
  createConnection(connection: InsertConnection): Promise<Connection>;
  getUserConnections(userId: number): Promise<Connection[]>;
  updateConnectionStatus(
    connectionId: number,
    status: string,
  ): Promise<Connection | undefined>;

  // Session store for authentication
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Set up Postgres session store using standard pg
    const PostgresSessionStore = connectPg(session);
    // Then use Pool as before in your constructor
    const sessionPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    this.sessionStore = new PostgresSessionStore({
      pool: sessionPool,
      createTableIfMissing: true,
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(
    id: number,
    data: Partial<InsertUser>,
  ): Promise<User | undefined> {
    const result = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // User profiles
  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const result = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return result[0];
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const result = await db.insert(userProfiles).values(profile).returning();
    return result[0];
  }

  async updateUserProfile(
    userId: number,
    data: Partial<InsertUserProfile>,
  ): Promise<UserProfile | undefined> {
    // Find the profile first
    const profile = await this.getUserProfile(userId);
    if (!profile) return undefined;

    // Update the profile
    const result = await db
      .update(userProfiles)
      .set(data)
      .where(eq(userProfiles.id, profile.id))
      .returning();
    return result[0];
  }

  // Monetization opportunities
  async saveOpportunity(
    opportunity: InsertMonetizationOpportunity,
  ): Promise<MonetizationOpportunity> {
    const result = await db
      .insert(monetizationOpportunities)
      .values(opportunity)
      .returning();
    return result[0];
  }

  async getUserOpportunities(
    userId: number,
  ): Promise<MonetizationOpportunity[]> {
    return db
      .select()
      .from(monetizationOpportunities)
      .where(eq(monetizationOpportunities.userId, userId));
  }

  async getSharedOpportunities(): Promise<MonetizationOpportunity[]> {
    return db
      .select()
      .from(monetizationOpportunities)
      .where(eq(monetizationOpportunities.shared, true));
  }

  // Messaging
  async sendMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async getUserMessages(userId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(
        or(eq(messages.recipientId, userId), eq(messages.senderId, userId)),
      );
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(messages.id, messageId));
  }

  // Connections
  async createConnection(connection: InsertConnection): Promise<Connection> {
    const result = await db.insert(connections).values(connection).returning();
    return result[0];
  }

  async getUserConnections(userId: number): Promise<Connection[]> {
    return db
      .select()
      .from(connections)
      .where(
        or(
          eq(connections.requesterId, userId),
          eq(connections.recipientId, userId),
        ),
      );
  }

  async updateConnectionStatus(
    connectionId: number,
    status: string,
  ): Promise<Connection | undefined> {
    const result = await db
      .update(connections)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(connections.id, connectionId))
      .returning();
    return result[0];
  }
}

// Export an instance of the DatabaseStorage
export const storage = new DatabaseStorage();
