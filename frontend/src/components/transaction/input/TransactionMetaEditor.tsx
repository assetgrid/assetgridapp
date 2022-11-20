import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../lib/ApiClient";
import { SetMetaFieldValue } from "../../../models/meta";
import TransactionMetaInput, { MetaFieldType } from "./TransactionMetaInput";

interface Props {
    value: SetMetaFieldValue[] | null
    onChange: (value: SetMetaFieldValue[]) => void
    disabled: boolean
    errors?: { [key: string]: string[] }
}

export default function TransactionMetaEditor (props: Props): React.ReactElement {
    const api = useApi();
    const { data: fields, isError } = useQuery({ queryKey: ["meta"], queryFn: api.Meta.list });
    const values = React.useMemo(() => props.value !== null
        ? new Map(props.value.map(x => [x.metaId, x]))
        : null, [props.value]);
    const { t } = useTranslation();

    if (isError) {
        <p>{t("common.error_occured")}</p>;
    }
    if (fields === undefined) {
        <p>{t("transaction.loading_custom_fields")!}</p>;
    }

    return <table className="table is-fullwidth">
        <thead>
            <tr>
                <th>{t("common.name")!}</th>
                <th>{t("common.value")!}</th>
            </tr>
        </thead>
        <tbody>
            { renderFields() }
        </tbody>
    </table>;

    function renderFields (): React.ReactNode {
        if (fields === undefined) {
            return <></>;
        }

        return fields.map((field, i) => <tr key={field.id}>
            <td>{field.name}</td>
            <td>
                <TransactionMetaInput
                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                    field={{
                        value: values?.get(field.id)?.value ?? null,
                        type: field.valueType
                    } as MetaFieldType}
                    onChange={value => updateMetaField(field.id, value)}
                    disabled={props.disabled}
                    errors={props.errors?.[`MetaData[${i}].Value`]} />
            </td>
        </tr>);
    }

    function updateMetaField (id: number, value: SetMetaFieldValue["value"]): void {
        if (fields === undefined) return;

        const newValue = values === null ? new Map<number, SetMetaFieldValue>() : values;
        Array.from(fields.values()).forEach(field => {
            if (field.id === id) {
                newValue.set(field.id, {
                    metaId: field.id,
                    type: field.valueType,
                    value
                });
            } else if (newValue.get(field.id) === undefined) {
                newValue.set(field.id, {
                    metaId: field.id,
                    type: field.valueType,
                    value: null
                });
            }
        });
        props.onChange(Array.from(newValue.values()));
    }
}
