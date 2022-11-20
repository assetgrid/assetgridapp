import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { formatDateTimeWithUser, formatNumberWithUser } from "../../../../lib/Utils";
import { CsvImportProfile } from "../../../../models/csvImportProfile";
import AccountLink from "../../../account/AccountLink";
import { useUser } from "../../../App";
import Table from "../../../common/Table";
import Tooltip from "../../../common/Tooltip";
import { CsvCreateTransaction } from "../importModels";
import DuplicateIndicator from "./DuplicateIndicator";

interface Props {
    transactions: CsvCreateTransaction[]
    duplicateIdentifiers: Set<string> | "fetching"
    tableFilter: (transaction: CsvCreateTransaction) => boolean
    tableDraw: number
    options: CsvImportProfile
}

export default function CsvMappingTransactionTable (props: Props): React.ReactElement {
    const user = useUser();
    const [page, setPage] = React.useState(1);
    const { t } = useTranslation();

    if (props.transactions === null) {
        return <p>{t("common.loading_please_wait")}</p>;
    }

    const items = React.useMemo(() => props.transactions.filter(props.tableFilter), [props.tableFilter]);

    return <Table pageSize={20}
        items={items}
        headings={<tr>
            <th>{t("common.identifier")}</th>
            <th>{t("common.timestamp")}</th>
            <th>{t("common.description")}</th>
            <th className="has-text-right">{t("common.amount")}</th>
            <th>{t("transaction.source")}</th>
            <th>{t("transaction.destination")}</th>
            <th>{t("common.category")}</th>
        </tr>}
        page={page}
        goToPage={setPage}
        renderItem={transaction =>
            <tr key={transaction.rowNumber}>
                <td>{transaction.identifier !== null && <DuplicateIndicator identifier={transaction.identifier} duplicateIdentifiers={props.duplicateIdentifiers} />}
                    {displayIdentifier(transaction)}
                </td>
                <td>{displayTimestamp(transaction)}</td>
                <td>{transaction.description}</td>
                <td style={{ textAlign: "right" }}>
                    {displayAmount(transaction)}
                </td>
                <td>
                    {props.options.sourceAccountType === "single"
                        ? (transaction.source !== null ? <AccountLink account={transaction.source} targetBlank={true} /> : <>{t("common.none")}</>)
                        : <Tooltip content={t("transaction.identifier_value", { value: transaction.sourceText })}>
                            {transaction.source !== null ? <AccountLink account={transaction.source} targetBlank={true} /> : <>{t("common.none")}</>}
                        </Tooltip>}
                </td>
                <td>
                    {props.options.destinationAccountType === "single"
                        ? (transaction.destination !== null ? <AccountLink account={transaction.destination} targetBlank={true} /> : <>{t("common.none")}</>)
                        : <Tooltip content={t("transaction.identifier_value", { value: transaction.sourceText })}>
                            {transaction.destination !== null ? <AccountLink account={transaction.destination} targetBlank={true} /> : <>{t("common.none")}</>}
                        </Tooltip>}
                </td>
                <td>
                    {transaction.category}
                </td>
            </tr>}
    />;

    function displayIdentifier (transaction: CsvCreateTransaction): React.ReactElement {
        if (props.options.duplicateHandling === "automatic") {
            if (transaction.identifier === null || transaction.identifier.trim() === "") {
                return <Tooltip content={t("import.could_not_calculate_identifier_for_transaction")}>
                    <span className="icon has-text-danger">
                        <FontAwesomeIcon icon={faExclamationTriangle} />
                    </span> {t("common.none")}
                </Tooltip>;
            } else {
                return <Tooltip content={transaction.identifier}>
                    <span className="has-text-link">{t("import.identifier_auto")}</span>
                </Tooltip>;
            }
        } else if (transaction.identifier === null || transaction.identifier.trim() === "") {
            return <Tooltip content={t("import.ignore_duplicates_of_transaction")}>
                {t("common.none")}
            </Tooltip>;
        } else {
            if (transaction.identifier.length < 20) {
                return <>{transaction.identifier}</>;
            } else {
                return <Tooltip content={transaction.identifier}>
                    {transaction.identifier.substring(0, 20) + "…"}
                </Tooltip>;
            }
        }
    }

    function displayTimestamp (transaction: CsvCreateTransaction): React.ReactElement {
        if (transaction.dateTime.isValid) {
            return <Tooltip content={t("import.timestamp_parsed_from", { raw_value: transaction.dateText })}>
                {formatDateTimeWithUser(transaction.dateTime, user)}
            </Tooltip>;
        } else {
            return <Tooltip content={t("import.timestamp_parsed_from", { raw_value: transaction.dateText })}>
                <span className="icon has-text-danger">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                </span> {t("import.could_not_parse_timestamp")}
            </Tooltip>;
        }
    }

    function displayAmount (transaction: CsvCreateTransaction): React.ReactElement {
        if (transaction.amount !== "invalid") {
            return <Tooltip content={t("import.amount_parsed_from", { raw_value: transaction.amountText })}>
                {formatNumberWithUser(transaction.amount, user)}
            </Tooltip>;
        } else {
            return <Tooltip content={t("import.amount_parsed_from", { raw_value: transaction.amountText })}>
                <span className="icon has-text-danger">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                </span> {t("import.could_not_parse_amount")}
            </Tooltip>;
        }
    }
}
