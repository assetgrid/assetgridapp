import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../../lib/ApiClient";
import { forget } from "../../lib/Utils";
import { FieldValueType, CreateMetaField, MetaField } from "../../models/meta";
import Card from "../common/Card";
import Hero from "../common/Hero";
import Modal from "../common/Modal";
import InputButton from "../input/InputButton";
import InputIconButton from "../input/InputIconButton";
import InputSelect from "../input/InputSelect";
import InputText from "../input/InputText";
import PageError from "./PageError";

export default function PageMeta (): React.ReactElement {
    const { t } = useTranslation();
    const fieldTypes = [
        {
            key: "text-single",
            value: t("metadata.select_valuetype.text_single_line"),
            type: FieldValueType.TextLine
        },
        {
            key: "text-multiple",
            value: t("metadata.select_valuetype.text_multiline"),
            type: FieldValueType.TextLong
        },
        {
            key: "file",
            value: t("metadata.select_valuetype.attachment"),
            type: FieldValueType.Attachment
        },
        {
            key: "boolean",
            value: t("metadata.select_valuetype.yes_no"),
            type: FieldValueType.Boolean
        },
        {
            key: "number",
            value: t("metadata.select_valuetype.number"),
            type: FieldValueType.Number
        },
        {
            key: "transaction",
            value: t("metadata.select_valuetype.transaction_link"),
            type: FieldValueType.Transaction
        },
        {
            key: "account",
            value: t("metadata.select_valuetype.account_link"),
            type: FieldValueType.Account
        }
    ] as const;

    const [deletingField, setDeletingField] = React.useState<MetaField | null>(null);
    const [isDeletingField, setIsDeletingField] = React.useState(false);
    const api = useApi();
    const queryClient = useQueryClient();
    const { data: fields, isError } = useQuery({ queryKey: ["meta"], queryFn: api.Meta.list });

    if (isError) {
        return <PageError />;
    }

    return <>
        <Hero title={t("metadata.custom_fields")} subtitle={t("metadata.create_or_modify_custom_fields")} />
        <div className="p-3">
            <Card title={t("metadata.transaction_fields")!} isNarrow={true}>
                {fields === undefined && <>{t("metadata.please_wait_loading")}</>}
                {fields !== undefined && fields.length === 0 && <>{t("metadata.no_custom_fields_exist")}</>}
                {fields !== undefined && fields.length > 0 && <table className="table">
                    <thead>
                        <tr>
                            <th>{t("metadata.field_name")}</th>
                            <th>{t("metadata.field_description")}</th>
                            <th>{t("metadata.field_type")}</th>
                            <th>{t("common.actions")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map(field => <tr key={field.id}>
                            <td>{field.name}</td>
                            <td>{field.description}</td>
                            <td>{fieldTypes.find(x => x.type === field.valueType)!.value}</td>
                            <td>
                                <InputIconButton icon={faTrashCan} onClick={() => setDeletingField(field)} />
                            </td>
                        </tr>)}
                    </tbody>
                </table>}
            </Card>
            <CreateFieldCard fieldTypes={fieldTypes} />

            {/* Deletion modal */}
            {deletingField !== null && <Modal
                active={true}
                title={t("metadata.delete_custom_field")!}
                close={() => setDeletingField(null)}
                footer={<>
                    {<InputButton onClick={forget(deleteField)} disabled={isDeletingField || api === null || fields === undefined}
                        className="is-danger">
                        {t("metadata.delete_field")}
                    </InputButton>}
                    <button className="button" onClick={() => setDeletingField(null)}>{t("common.cancel")}</button>
                </>}>
                <p>{t("metadata.confirm_delete_field", { fieldname: deletingField.name })}</p>
                <p>{t("common.action_is_irreversible")}</p>
            </Modal>}
        </div>
    </>;

    async function deleteField (): Promise<void> {
        if (api === null) return;
        if (deletingField === null) return;

        setIsDeletingField(true);
        await api.Meta.delete(deletingField.id);
        await queryClient.setQueryData<MetaField[]>(["meta"], old => old?.filter(x => x.id !== deletingField.id));
        setDeletingField(null);
    }
}

interface CreateFieldProps {
    fieldTypes: Readonly<Array<{ key: string, value: string, type: FieldValueType }>>
}

function CreateFieldCard (props: CreateFieldProps): React.ReactElement {
    const [model, setModel] = React.useState<CreateMetaField>({
        name: "",
        description: "",
        type: 0,
        valueType: FieldValueType.TextLine
    });
    const [isCreating, setIsCreating] = React.useState(false);
    const [errors, setErrors] = React.useState<{ [key: string]: string[] }>({});
    const api = useApi();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return <Card title={t("metadata.add_custom_field")!} isNarrow={true}>
        <InputText
            onChange={e => setModel({ ...model, name: e.target.value })}
            value={model.name}
            label={t("metadata.field_name")!}
            disabled={isCreating}
            errors={errors.Name} />
        <InputText
            onChange={e => setModel({ ...model, description: e.target.value })}
            value={model.description}
            label={t("metadata.field_description")!}
            disabled={isCreating}
            errors={errors.Description} />
        <InputSelect
            onChange={value => setModel({ ...model, valueType: props.fieldTypes.find(x => x.key === value)!.type })}
            value={props.fieldTypes.find(x => x.type === model.valueType)!.key}
            label={t("metadata.field_type")!}
            isFullwidth={false}
            items={props.fieldTypes as unknown as Array<{ key: string, value: string }>}
            disabled={isCreating} />
        <InputButton className="is-primary"
            disabled={isCreating || api === null}
            onClick={forget(createField)}>
            {t("metadata.create_field")!}
        </InputButton>
    </Card>;

    async function createField (): Promise<void> {
        if (api === null) return;

        setIsCreating(true);
        setErrors({});

        const result = await api.Meta.create(model);
        if (result.status === 200) {
            setModel({
                description: "",
                name: "",
                type: 0,
                valueType: model.valueType
            });
            await queryClient.setQueryData<MetaField[]>(["meta"], old => old !== undefined ? [...old, result.data] : undefined);
        } else if (result.status === 400) {
            setErrors(result.errors);
        }

        setIsCreating(false);
    }
}
