import * as React from "react";
import { FieldValueType, MetaField } from "../../../../models/meta";
import Tooltip from "../../../common/Tooltip";
import { useTranslation } from "react-i18next";
import { formatNumberWithUser } from "../../../../lib/Utils";
import { useUser } from "../../../App";
import { CsvCreateTransactionMetaValue } from "../importModels";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import Decimal from "decimal.js";

interface Props {
    field: MetaField
    value?: CsvCreateTransactionMetaValue
}

export function MetaFieldValue (props: Props): React.ReactElement {
    const { t } = useTranslation();
    const user = useUser();

    if (props.value === undefined) {
        return <p>-</p>;
    }

    switch (props.value.type) {
        case FieldValueType.TextLine:
        case FieldValueType.TextLong:
            return <p>{props.value.value as string}</p>;
        case FieldValueType.Number:
            if (props.value.value !== "invalid") {
                return <Tooltip content={t("import.amount_parsed_from", { raw_value: props.value.sourceText })}>
                    {formatNumberWithUser(props.value.value as Decimal, user)}
                </Tooltip>;
            } else {
                return <Tooltip content={t("import.amount_parsed_from", { raw_value: props.value.sourceText })}>
                    <span className="icon has-text-danger">
                        <FontAwesomeIcon icon={faExclamationTriangle} />
                    </span> {t("import.could_not_parse_amount")}
                </Tooltip>;
            }
        default:
            return <p>-</p>;
    }
}
