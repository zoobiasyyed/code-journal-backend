/* eslint-disable @typescript-eslint/no-unused-vars -- Remove me */
import 'dotenv/config';
import pg from 'pg';
import express from 'express';
import { ClientError, errorMiddleware } from './lib/index.js';

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const app = express();
app.use(express.json());

app.get('/api/entries', async (req, res, next) => {
  try {
    const sql = `
    select *
    from "entries"
    `;
    const result = await db.query(sql);
    const entries = result.rows;
    res.status(200).json(entries);
  } catch (err) {
    next(err);
  }
});

app.get('/api/entries/:entryId', async (req, res, next) => {
  try {
    const { entryId } = req.params;
    if (!Number.isInteger(+entryId))
      throw new ClientError(400, `entryId ${entryId} must be an integer`);
    const sql = `
    select *
    from "entries"
    where "entryId" = $1
    `;
    const params = [entryId];
    const result = await db.query(sql, params);
    const entry = result.rows[0];
    if (!entry) throw new ClientError(404, `entryId ${entryId} not found`);
    res.status(200).json(entry);
  } catch (err) {
    next(err);
  }
});

app.post('/api/entries', async (req, res, next) => {
  try {
    const { title, notes, photoUrl } = req.body;
    if (!title) throw new ClientError(400, `title is undefined`);
    if (!notes) throw new ClientError(400, `notes is undefined`);
    if (!photoUrl) throw new ClientError(400, `photoUr is undefined`);

    const sql = `
    insert into "entries" ("title", "notes", "photoUrl")
    values ($1, $2, $3)
    returning *
    `;
    const params = [title, notes, photoUrl];
    const result = await db.query(sql, params);
    const postedEntry = result.rows[0];
    res.status(201).json(postedEntry);
  } catch (err) {
    next(err);
  }
});

app.put('/api/entries/:entryId', async (req, res, next) => {
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
    where "entryId" = $4
    returning *
    `;
    const params = [title, notes, photoUrl, entryId];
    const result = await db.query(sql, params);
    const editedEntry = result.rows[0];
    if (!editedEntry)
      throw new ClientError(404, `entryId ${entryId} not found`);
    res.status(204).json(editedEntry);
  } catch (err) {}
});

app.delete('/api/entries/:entryId', async (req, res, next) => {
  try {
    const { entryId } = req.params;
    if (!Number.isInteger(+entryId))
      throw new ClientError(400, `entryId ${entryId} must be an integer`);
    const sql = `
    Delete From "entries"
    Where "entryId" = $1
    returning *
    `;
    const params = [entryId];
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
