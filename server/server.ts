/* eslint-disable @typescript-eslint/no-unused-vars -- Remove me */
import 'dotenv/config';
import pg from 'pg';
import express from 'express';
import { authMiddleware, ClientError, errorMiddleware } from './lib/index.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

type User = {
  userId: number;
  username: string;
  hashedPassword: string;
};
type Auth = {
  username: string;
  password: string;
};

const hashKey = process.env.TOKEN_SECRET ?? '';
if (!hashKey) throw new Error('TOKEN_SECRET not found in env');

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const app = express();
app.use(express.json());

app.post('/api/auth/sign-up', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new ClientError(400, 'username and password are required fields');
    }
    const hashedPassword = await argon2.hash(password);
    const sql = `
      insert into "users" ("username", "hashedPassword")
      values ($1, $2)
      returning "userId", "username", "createdAt"
    `;
    const params = [username, hashedPassword];
    const result = await db.query<User>(sql, params);
    const [user] = result.rows;
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/sign-in', async (req, res, next) => {
  try {
    const { username, password } = req.body as Partial<Auth>;
    if (!username || !password) {
      throw new ClientError(401, 'invalid login');
    }

    const sql = `
      select "userId", "hashedPassword"
      from "users"
      where "username" = $1
    `;

    const result = await db.query(sql, [username]);
    const user = result.rows[0];
    if (!user) throw new ClientError(401, 'invalid login');

    const verified = await argon2.verify(user.hashedPassword, password);
    if (!verified) throw new ClientError(401, 'invalid login');

    const payload = { userId: user.userId, username };
    const token = jwt.sign(payload, hashKey);
    res.status(200).json({ user: payload, token });
  } catch (err) {
    next(err);
  }
});

app.get('/api/entries', authMiddleware, async (req, res, next) => {
  try {
    const sql = `
    select *
    from "entries"
    where "userId" = $1
    `;
    const result = await db.query(sql, [req.user?.userId]);
    const entries = result.rows;
    res.status(200).json(entries);
  } catch (err) {
    next(err);
  }
});

app.get('/api/entries/:entryId', authMiddleware, async (req, res, next) => {
  try {
    const { entryId } = req.params;
    if (!Number.isInteger(+entryId))
      throw new ClientError(400, `entryId ${entryId} must be an integer`);
    const sql = `
    select *
    from "entries"
    where "entryId" = $1 and "userId" = $2
    `;
    const params = [entryId, req.user?.userId];
    const result = await db.query(sql, params);
    const entry = result.rows[0];
    if (!entry) throw new ClientError(404, `entryId ${entryId} not found`);
    res.status(200).json(entry);
  } catch (err) {
    next(err);
  }
});

app.post('/api/entries', authMiddleware, async (req, res, next) => {
  try {
    const { title, notes, photoUrl } = req.body;
    if (!title) throw new ClientError(400, `title is undefined`);
    if (!notes) throw new ClientError(400, `notes is undefined`);
    if (!photoUrl) throw new ClientError(400, `photoUr is undefined`);

    const sql = `
    insert into "entries" ("title", "notes", "photoUrl", "userId")
    values ($1, $2, $3, $4)
    returning *
    `;
    const params = [title, notes, photoUrl, req.user?.userId];
    const result = await db.query(sql, params);
    const postedEntry = result.rows[0];
    res.status(201).json(postedEntry);
  } catch (err) {
    next(err);
  }
});

app.put('/api/entries/:entryId', authMiddleware, async (req, res, next) => {
  try {
    const { entryId } = req.params;
    const { title, notes, photoUrl } = req.body;

    if (!entryId) throw new ClientError(400, `entryId is undefined`);
    if (!Number.isInteger(+entryId))
      throw new ClientError(400, `entryId ${entryId} must be an integer`);
    if (!title) throw new ClientError(400, `title is undefined`);
    if (!notes) throw new ClientError(400, `notes is undefined`);
    if (!photoUrl) throw new ClientError(400, `photoUr is undefined`);

    const sql = `
    update "entries"
    set "title" = $1, "notes" = $2, "photoUrl" = $3
    where "entryId" = $4 and
          "userId" = $5
    returning *
    `;
    const params = [title, notes, photoUrl, entryId, req.user?.userId];
    const result = await db.query(sql, params);
    const editedEntry = result.rows[0];
    if (!editedEntry)
      throw new ClientError(404, `entryId ${entryId} not found`);
    res.status(204).json(editedEntry);
  } catch (err) {}
});

app.delete('/api/entries/:entryId', authMiddleware, async (req, res, next) => {
  try {
    const { entryId } = req.params;
    if (!Number.isInteger(+entryId))
      throw new ClientError(400, `entryId ${entryId} must be an integer`);
    const sql = `
    Delete From "entries"
    Where "entryId" = $1 and "userId" = $2
    returning *
    `;
    const params = [entryId, req.user?.userId];
    const result = await db.query(sql, params);
    const deletedEntry = result.rows[0];
    if (!deletedEntry) throw new ClientError(404, 'no entry');
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

app.use(errorMiddleware);

app.listen(process.env.PORT, () => {
  console.log(`express server listening on port ${process.env.PORT}`);
});
