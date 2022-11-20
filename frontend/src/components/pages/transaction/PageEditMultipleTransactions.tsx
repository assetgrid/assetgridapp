import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useApi } from "../../../lib/ApiClient";
import { debounce, emptyQuery, forget } from "../../../lib/Utils";
import { TransactionAction, TransactionAutomationPermissions } from "../../../models/automation/transactionAutomation";
import { SearchGroup } from "../../../models/search";
import Card from "../../common/Card";
import Hero from "../../common/Hero";
import InputButton from "../../input/InputButton";
import TransactionActionEditor from "../../transaction/automation/TransactionActionEditor";
import TransactionFilterEditor from "../../transaction/TransactionFilterEditor";
import TransactionList from "../../transaction/table/TransactionList";
import { useQueryClient } from "@tanstack/react-query";

export default function PageEditMultipleTransactions (): React.ReactElement {
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [draw, setDraw] = React.useState(0);
    const [query, setQuery] = React.useState<SearchGroup>(typeof window.history.state.usr?.query === "object"
        ? window.history.state.usr.query
        : emptyQuery);
    const [action, setAction] = React.useState<TransactionAction>({ key: "set-description", value: "" });
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    // The table query is modified separately and debounced from the main query to prevent excessive redraws when modifying the query
    const [tableQuery, setTableQuery] = React.useState<SearchGroup>(query);

    const navigate = useNavigate();
    const showBack = window.history.state.usr.showBack === true;

    // Keep history state updated
    const updateHistoryDebounced = React.useCallback(debounce(updateHistory, 300), []);
    const setTableQueryDebounced = React.useCallback(debounce((query: SearchGroup) => { setTableQuery(query); setDraw(draw => draw + 1); }, 300), []);
    const api = useApi();
    const first = React.useRef(true);
    React.useEffect(() => {
        updateHistoryDebounced(query);
        if (!first.current) {
            setTableQueryDebounced(query);
        }
        first.current = false;
    }, [query]);

    return <>
        <Hero title={t("transaction.edit_transactions")} subtitle={t("transaction.modify_multiple_transactions")} />
        <div className="p-3">
            <Card title={t("search.query")!} isNarrow={false}>
                <TransactionFilterEditor disabled={isUpdating} query={query} setQuery={query => { setQuery(query); } } />
            </Card>
            <Card title={t("automation.action")!} isNarrow={false}>
                <TransactionActionEditor action={action} onChange={setAction} disabled={isUpdating} />

                <div className="buttons">
                    <InputButton className="is-primary" onClick={forget(update)} disabled={isUpdating || api === null}>
                        {t("common.apply_changes")}
                    </InputButton>
                    {showBack && <InputButton onClick={() => navigate(-1)}>
                        {t("common.back")}
                    </InputButton>}
                </div>
            </Card>
            <Card title="Transactions" isNarrow={false}>
                <p>{t("transaction.the_follow_will_be_modified")}</p>
                <TransactionList draw={draw} allowEditing={false} allowLinks={false} query={tableQuery} />
            </Card>
        </div>
    </>;

    function updateHistory (query: SearchGroup): void {
        window.history.replaceState({
            ...window.history.state,
            usr: {
                query,
                showBack
            }
        }, "");
    }

    async function update (): Promise<void> {
        setIsUpdating(true);
        if (api === null) {
            return;
        }

        await api.Automation.Transaction.runSingle({
            name: "",
            description: "",
            triggerOnCreate: false,
            triggerOnModify: false,
            actions: [action],
            enabled: true,
            query,
            permissions: TransactionAutomationPermissions.Modify
        });
        await queryClient.invalidateQueries(["transaction"]);

        setIsUpdating(false);
        setDraw(draw => draw + 1);
    }
}
