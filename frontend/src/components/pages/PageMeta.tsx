import * as React from "react";
import { useApi } from "../../lib/ApiClient";
import { forget } from "../../lib/Utils";
import { FieldValueType, CreateMetaField, MetaField } from "../../models/meta";
import Card from "../common/Card";
import Hero from "../common/Hero";
import InputButton from "../input/InputButton";
import InputSelect from "../input/InputSelect";
import InputText from "../input/InputText";

const fieldTypes = [
    {
        key: "text-single",
        value: "Text (single line)",
        type: FieldValueType.TextLine
    },
    {
        key: "text-multiple",
        value: "Text (multiple line)",
        type: FieldValueType.TextLong
    },
    {
        key: "file",
        value: "File attachment",
        type: FieldValueType.Attachment
    },
    {
        key: "boolean",
        value: "Yes or no value",
        type: FieldValueType.Boolean
    },
    {
        key: "number",
        value: "Number",
        type: FieldValueType.Number
    },
    {
        key: "transaction",
        value: "Transaction (link to)",
        type: FieldValueType.Transaction
    },
    {
        key: "account",
        value: "Account (link to)",
        type: FieldValueType.Account
    }
] as const;

export default function PageMeta (): React.ReactElement {
    const [fields, setFields] = React.useState<MetaField[] | "fetching">("fetching");
    const api = useApi();

    React.useEffect(forget(updateFields), [api]);

    return <>
        <Hero title="Custom fields" subtitle="Create an modify custom fields" />
        <div className="p-3">
            <Card title="Transaction fields" isNarrow={true}>
                {fields === "fetching" && <>Please wait while loading custom fields&hellip;</>}
                {fields.length === 0 && <>You have not created any custom fields.</>}
                {fields !== "fetching" && fields.length > 0 && <table className="table">
                    <thead>
                        <tr>
                            <th>Field name</th>
                            <th>Field Description</th>
                            <th>Type</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map(field => <tr key={field.id}>
                            <td>{field.name}</td>
                            <td>{field.description}</td>
                            <td>{fieldTypes.find(x => x.type === field.valueType)!.value}</td>
                            <td></td>
                        </tr>)}
                    </tbody>
                </table>}
            </Card>
            <CreateFieldCard onCreated={forget(updateFields)} />
        </div>
    </>;

    async function updateFields (): Promise<void> {
        if (api === null) return;

        setFields("fetching");
        const result = await api.Meta.list();
        setFields(result.data);
    }
}

interface CreateFieldProps {
    onCreated: () => void
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

    return <Card title="Add custom field" isNarrow={true}>
        <InputText
            onChange={e => setModel({ ...model, name: e.target.value })}
            value={model.name}
            label="Field name"
            disabled={isCreating}
            errors={errors.Name} />
        <InputText
            onChange={e => setModel({ ...model, description: e.target.value })}
            value={model.description}
            label="Field description"
            disabled={isCreating}
            errors={errors.Description} />
        <InputSelect
            onChange={value => setModel({ ...model, valueType: fieldTypes.find(x => x.key === value)!.type })}
            value={fieldTypes.find(x => x.type === model.valueType)!.key}
            label="Field description"
            isFullwidth={false}
            items={fieldTypes as unknown as Array<{ key: string, value: string }>}
            disabled={isCreating} />
        <InputButton className="is-primary"
            disabled={isCreating || api === null}
            onClick={forget(createField)}>
            Create field
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
            props.onCreated();
        } else if (result.status === 400) {
            setErrors(result.errors);
        }

        setIsCreating(false);
    }
}
