import * as React from "react";
import { Api, useApi } from "../../../lib/ApiClient";
import { SearchGroup, SearchGroupType, SearchOperator } from "../../../models/search";
import { Transaction } from "../../../models/transaction";
import Modal from "../../common/Modal";
import InputButton from "../../input/InputButton";
import TransactionList from "../TransactionList";

interface Props {
    close: () => void;
    merged: () => void;
    transactions: { [id: number]: boolean };
    active: boolean;
}

export default function MergeTransactionsModal(props: Props) {
    const [isMerging, setIsMerging] = React.useState(false);
    const api = useApi();
    const [selectedTransaction, setSelectedTransaction] = React.useState<number | null>(null);
    const [draw, setDraw] = React.useState(0);

    const query = React.useMemo(() => ({
        type: SearchGroupType.Query,
        query: {
            column: "Id",
            operator: SearchOperator.In,
            value: Object.keys(props.transactions)
                .map(x => Number(x))
                .filter(x => props.transactions[x] === true),
            not: false
        }
    } as SearchGroup), [props.active]);
    
    React.useEffect(() => {
        if (props.active) {
            setDraw(draw => draw + 1)
        }
    }, [props.active]);

    return <Modal
        active={props.active}
        title={"Merge transactions"}
        close={() => props.close()}
        footer={<>
            {<InputButton onClick={() => deleteTransaction()} disabled={isMerging || api === null || selectedTransaction === null} className="is-primary">Merge transactions</InputButton>}
            <button className="button" onClick={() => props.close()}>Cancel</button>
        </>}>
        <p>Do you want to merge the following transactions. Merging will add the identifiers from all transactions to a single one and delete the others.</p>
        <p>Chose which transaction you want to keep:</p>
        <TransactionList
            allowLinks={false}
            allowEditing={false}
            pageSize={5}
            query={query}
            draw={draw}
            selectedTransaction={[selectedTransaction, setSelectedTransaction]}
        />
    </Modal>;
    
    async function deleteTransaction() {
        if (api === null || selectedTransaction == null) return;

        setIsMerging(true);
        const transactions = await api.Transaction.search({ from: 0, to: 2000, query, descending: false, orderByColumn: "Id" });
        await api.Transaction.update(selectedTransaction, { identifiers: [...transactions.data.flatMap(t => t.identifiers)] });
        await api.Transaction.deleteMultiple({ 
            type: SearchGroupType.And,
            children: [
                query, {
                    type: SearchGroupType.Query,
                    query: {
                        column: "Id",
                        value: selectedTransaction,
                        not: true,
                        operator: SearchOperator.Equals
                    }
                }
            ]
        });
        setIsMerging(false);
        props.merged();
    }
}