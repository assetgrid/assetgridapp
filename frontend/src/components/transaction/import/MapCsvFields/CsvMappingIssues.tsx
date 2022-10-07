import * as React from "react";
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

    if (fetching) {
        return <>Processing&hellip; Please wait.</>;
    }

    const noAccountFilter = (t: CsvCreateTransaction): boolean => t.source === null && t.destination === null;
    const sameSourceDestinationFilter = (t: CsvCreateTransaction): boolean => t.source !== null && t.source?.id === t.destination?.id;
    const duplicateFilter = (t: CsvCreateTransaction): boolean => t.identifier !== null && (props.duplicateIdentifiers as Set<string>).has(t.identifier);
    const errorFilter = (t: CsvCreateTransaction): boolean => t.amount === "invalid" || !t.dateTime.isValid;
    const totalIssueCount = props.transactions.filter(t => noAccountFilter(t) || sameSourceDestinationFilter(t) || duplicateFilter(t) || errorFilter(t)).length;

    return <>
        {totalIssueCount === 0
            ? <p className="mb-3">No issues detected</p>
            : <Message title="Problems detected" type="danger">
                The following issues were detected:
                <div className="content">
                    <ul>
                        {props.transactions.filter(noAccountFilter).length > 0 && <li>
                            {props.transactions.filter(noAccountFilter).length} transactions do not have a source nor destination. They will not be created{" "}
                            <a className="has-text-link"
                                onClick={() => props.setTableFilter("Currently only transactions that have no source or destination account are shown.", noAccountFilter)}>
                                Show transactions
                            </a>
                        </li>}
                        {props.transactions.filter(sameSourceDestinationFilter).length > 0 && <li>
                            {props.transactions.filter(sameSourceDestinationFilter).length} transactions have the same source and destination. They will not be created{" "}
                            <a className="has-text-link"
                                onClick={() => props.setTableFilter("Currently only transactions that have the same source and destination account are shown.", sameSourceDestinationFilter)}>
                                Show transactions
                            </a>
                        </li>}
                        {props.transactions.filter(duplicateFilter).length > 0 && <li>
                            {props.transactions.filter(duplicateFilter).length } transactions have duplicate identifiers. Only one transaction can exist for each identifier.{" "}
                            <a className="has-text-link"
                                onClick={() => props.setTableFilter("Currently only duplicate transactions are shown.", duplicateFilter)}>
                                Show transactions
                            </a>
                        </li>}
                        {props.transactions.filter(errorFilter).length > 0 && <li>
                            {props.transactions.filter(errorFilter).length } transactions have errors. They will not be created{" "}
                            <a className="has-text-link"
                                onClick={() => props.setTableFilter("Currently only transactions with parsing errors are shown.", errorFilter)}>
                                Show transactions
                            </a>
                        </li>}
                    </ul>
                </div>
            </Message>
        }
    </>;
}
