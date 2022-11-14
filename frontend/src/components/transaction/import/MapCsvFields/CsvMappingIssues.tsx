import * as React from "react";
import { useTranslation } from "react-i18next";
import Message from "../../../common/Message";
import { CsvCreateTransaction } from "../importModels";

interface Props {
    transactions: CsvCreateTransaction[]
    duplicateIdentifiers: Set<string> | "fetching"
    setTableFilter: (message: string, filter: ((transaction: CsvCreateTransaction) => boolean)) => void
}

export default function CsvMappingIssues (props: Props): React.ReactElement {
    // Waiting for a server call before the issues can be shown
    const fetching = props.duplicateIdentifiers === "fetching";
    const { t } = useTranslation();

    if (fetching) {
        return <>{t("common.please_wait")}</>;
    }

    const noAccountFilter = (t: CsvCreateTransaction): boolean => t.source === null && t.destination === null;
    const sameSourceDestinationFilter = (t: CsvCreateTransaction): boolean => t.source !== null && t.source?.id === t.destination?.id;
    const duplicateFilter = (t: CsvCreateTransaction): boolean => t.identifier !== null && (props.duplicateIdentifiers as Set<string>).has(t.identifier);
    const errorFilter = (t: CsvCreateTransaction): boolean => t.amount === "invalid" || !t.dateTime.isValid;
    const totalIssueCount = props.transactions.filter(t => noAccountFilter(t) || sameSourceDestinationFilter(t) || duplicateFilter(t) || errorFilter(t)).length;

    return <>
        {totalIssueCount === 0
            ? <p className="mb-3">{t("import.no_issues_detected")}</p>
            : <Message title={t("import.issues_detected")} type="danger">
                {t("import.following_issues_detected")}
                <div className="content">
                    <ul>
                        {props.transactions.filter(noAccountFilter).length > 0 && <li>
                            {t("import.n_transactions_do_not_have_source_destination", { count: props.transactions.filter(noAccountFilter).length })}{" "}
                            <a className="has-text-link"
                                onClick={() => props.setTableFilter(t("import.only_showing_transactions_no_source_destination"), noAccountFilter)}>
                                {t("import.show_transactions")}
                            </a>
                        </li>}
                        {props.transactions.filter(sameSourceDestinationFilter).length > 0 && <li>
                            {t("import.n_transactions_have_same_source_destination", { count: props.transactions.filter(sameSourceDestinationFilter).length })}{" "}
                            <a className="has-text-link"
                                onClick={() => props.setTableFilter(t("import.only_showing_transactions_same_source_destination"), sameSourceDestinationFilter)}>
                                {t("import.show_transactions")}
                            </a>
                        </li>}
                        {props.transactions.filter(duplicateFilter).length > 0 && <li>
                            {t("import.n_duplicate_transactions", { count: props.transactions.filter(duplicateFilter).length })}{" "}
                            <a className="has-text-link"
                                onClick={() => props.setTableFilter(t("import.only_showing_duplicate_transactions"), duplicateFilter)}>
                                {t("import.show_transactions")}
                            </a>
                        </li>}
                        {props.transactions.filter(errorFilter).length > 0 && <li>
                            {t("import.n_error_transactions", { count: props.transactions.filter(errorFilter).length })}{" "}
                            <a className="has-text-link"
                                onClick={() => props.setTableFilter(t("import.only_showing_error_transactions"), errorFilter)}>
                                {t("import.show_transactions")}
                            </a>
                        </li>}
                    </ul>
                </div>
            </Message>
        }
    </>;
}
