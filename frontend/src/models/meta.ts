import Decimal from "decimal.js";
import { Account } from "./account";
import { Transaction } from "./transaction";

export interface MetaField {
    id: number
    name: string
    description: string
    type: 0
    valueType: FieldValueType
    permissions: FieldPermissions
}

export interface MetaFieldValue {
    metaId: number
    metaName: string
    type: FieldValueType
    value: string | Decimal | boolean | Account | Transaction | null
}

export interface SetMetaFieldValue {
    metaId: number
    type: FieldValueType
    value: string | Decimal | boolean | Account | Transaction | null
}

export interface CreateMetaField {
    name: string
    description: string
    type: 0
    valueType: FieldValueType
}

export enum FieldValueType {
    TextLine,
    TextLong,
    Transaction,
    Account,
    Attachment,
    Boolean,
    Number
}

export enum FieldPermissions {
    User,
    Owner
}
