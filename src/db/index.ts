import { Dexie, Table } from "dexie";
import { Track } from "./track";
import { v4 } from 'uuid'

type TableNames = 'tracks';
type TableTypes = {
    tracks: Track;
}

export class Db extends Dexie {
    tracks: Table<Track, string>;

    constructor() {
        super('db');
        this.version(1)
            .stores({
                tracks: 'id'
            });
    }
}

export const db = new Db();

export const getTable = <TableName extends TableNames>(table: TableName): Dexie.Table<TableTypes[TableName]> => {
    return db[table];
}

export const insertItem = async <TableName extends TableNames>(table: TableName, item: Omit<TableTypes[TableName], 'id'>) => {
    const insert = item as TableTypes[TableName];
    insert.id = v4();

    await getTable(table).add(insert, insert.id);
    return insert;
}
