export interface MetaField {
    id: number
    name: string
    description: string
    type: 0
    valueType: FieldValueType
    permissions: FieldPermissions
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
