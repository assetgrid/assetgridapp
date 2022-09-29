import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { useNavigate } from "react-router";
import { Api, useApi } from "../../../lib/ApiClient";
import { debounce, emptyQuery } from "../../../lib/Utils";
import { SearchGroup } from "../../../models/search";
import { Transaction, TransactionLine, UpdateTransaction } from "../../../models/transaction";
import InputAccount from "../../account/input/InputAccount";
import Card from "../../common/Card";
import Hero from "../../common/Hero";
import InputButton from "../../input/InputButton";
import InputCategory from "../../input/InputCategory";
import InputDateTime from "../../input/InputDateTime";
import InputIconButton from "../../input/InputIconButton";
import InputNumber from "../../input/InputNumber";
import InputSelect from "../../input/InputSelect";
import InputText from "../../input/InputText";
import { deserializeQueryForHistory, serializeQueryForHistory } from "../../transaction/filter/FilterHelpers";
import TransactionFilterEditor from "../../transaction/filter/TransactionFilterEditor";
import TransactionList from "../../transaction/TransactionList";

const actions = [
    { key: "set-datetime", value: "Set timestamp" },
    { key: "set-description", value: "Set description" },
    { key: "set-amount", value: "Set amount" },
    { key: "set-lines", value: "Set lines" },
    { key: "set-source", value: "Set source account" },
    { key: "set-destination", value: "Set destination account" },
    { key: "set-category", value: "Set category" },
    { key: "delete", value: "Delete" },
] as const;
type Action = typeof actions[number]['key'];

export default function PageEditMultipleTransactions() {
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [action, setAction] = React.useState<Action | null>(null);
    const [draw, setDraw] = React.useState(0);
    const [model, setModel] = React.useState<UpdateTransaction | null>(null);
    const [query, setQuery] = React.useState<SearchGroup>(window.history.state.usr?.query
        ? deserializeQueryForHistory(window.history.state.usr.query)
        : emptyQuery);
    
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
    
    React.useEffect(() => {
        switch (action) {
            case "set-amount":
                setModel({ total: new Decimal(0) });
                break;
            case "set-category":
                setModel({ category: "" });
                break;
            case "set-datetime":
                setModel({ dateTime: DateTime.now() });
                break;
            case "set-description":
                setModel({ description: "" });
                break;
            case "set-destination":
                setModel({ destinationId: null });
                break;
            case "set-source":
                setModel({ sourceId: null });
                break;
            case "set-lines":
                setModel({ lines: [], total: new Decimal(0) });
                break;
            case "delete":
                setModel({});
                break;
        }
    }, [action]);

        return<>
        <Hero title="Edit transactions" subtitle="Modify multiple transaction at once" />
        <div className="p-3">
            <Card title="Query" isNarrow={false}>
                <TransactionFilterEditor query={query} setQuery={query => { setQuery(query) } } />
            </Card>
            <Card title="Actions" isNarrow={false}>
                {renderAction(action, setAction, model, setModel, isUpdating)}

                <div className="buttons">
                    <InputButton className="is-primary" onClick={() => update()} disabled={isUpdating || model === null || api === null}>Apply changes</InputButton>
                    {showBack && <InputButton onClick={() => navigate(-1)}>Back</InputButton>}
                </div>
            </Card>
            <Card title="Transactions" isNarrow={false}>
                <p>The following transactions will be modified:</p>
                <TransactionList draw={draw} allowEditing={false} allowLinks={false} query={tableQuery} />
            </Card>
        </div>
    </>;

    function updateHistory(query: SearchGroup) {
        window.history.replaceState({
            ...window.history.state,
            usr: {
                query: serializeQueryForHistory(query),
                showBack: showBack
            }
        }, "");
    }
    
    async function update() {
        setIsUpdating(true);
        if (model === null || api === null) {
            return;
        }

        if (action === "delete") {
            await api.Transaction.deleteMultiple(query);
        } else {
            await api.Transaction.updateMultiple(query, model);
        }
        setIsUpdating(false);
        setDraw(draw => draw + 1);
    }
}

function renderAction(action: Action | null, setAction: (action: Action) => void, model: UpdateTransaction | null, setModel: React.Dispatch<UpdateTransaction>, disabled: boolean) {
    if (action === null) {
        return <InputSelect
            placeholder="Select action"
            label="Action"
            items={[...actions]}
            value={action}
            onChange={value => setAction(value as Action)}></InputSelect>;
    }

    if (!model) {
        return <></>;
    }

    const select = <InputSelect
        disabled={disabled}
        label="Action"
        items={[...actions]}
        value={action}
        onChange={value => setAction(value as Action)}></InputSelect>;

    switch (action) {
        case "set-lines":
            return <>
                {select}
                <TransactionLineEditor
                    lines={model.lines!}
                    disabled={disabled}
                    setLines={lines => setModel({ lines, total: lines.length === 0 ? undefined : lines.reduce((sum, line) => sum.add(line.amount), new Decimal(0)) })} />
            </>;
        case "delete":
            return select;
        case "set-datetime":
        case "set-description":
        case "set-destination":
        case "set-category":
        case "set-source":
            return <div className="columns">
                <div className="column">
                    {select}
                </div>
                <div className="column">{renderActionValue(action, model, setModel, disabled)}</div>
            </div>
        case "set-amount":
            return <><div className="columns">
                    <div className="column">
                        {select}
                    </div>
                    <div className="column">{renderActionValue(action, model, setModel, disabled)}</div>
                </div>
                <p>This action will not run for split transactions.</p>
            </>
    }
}

function renderActionValue(action: Action, model: UpdateTransaction, setModel: React.Dispatch<UpdateTransaction>, disabled: boolean): React.ReactElement {
    switch (action) {
        case "set-datetime":
            if (! model.dateTime) {
                return <></>;
            }
            return <InputDateTime label="Select timestamp"
                disabled={disabled}
                fullwidth={false}
                value={model.dateTime}
                onChange={value => setModel({ ...model, dateTime: value })} />
        case "set-description":
            if (model.description === undefined) {
                return <></>;
            }
            return <InputText label="Enter description"
                disabled={disabled}
                value={model.description}
                onChange={e => setModel({ ...model, description: e.target.value })} />
        case "set-category":
            if (model.category === undefined) {
                return <></>;
            }
            console.log(model);
            return <InputCategory label="Enter category"
                value={model.category}
                onChange={value => setModel({ ...model, category: value })}
                disabled={disabled} />
        case "set-amount":
            if (!model?.total) {
                return <></>;
            }
            return <InputNumber label="Enter amount"
                value={model.total}
                onChange={value => setModel({ ...model, total: value })}
                disabled={disabled}
                allowNull={false} />;
        case "set-source":
            if (!model) {
                return <></>;
            }

            return <InputAccount label="Select source account"
                value={model.sourceId ?? null}
                onChange={value => setModel({ ...model, sourceId: value?.id })}
                disabled={disabled}
                allowNull={true}
                allowCreateNewAccount={true} />
        case "set-destination":
            if (!model) {
                return <></>;
            }

            return <InputAccount label="Select destination account"
                value={model.destinationId ?? null}
                onChange={value => setModel({ ...model, destinationId: value?.id })}
                disabled={disabled}
                allowNull={true}
                allowCreateNewAccount={true} />
    }
    throw "Invalid action";
}


interface TransactionLineEditorProps {
    lines: TransactionLine[];
    setLines: (value: TransactionLine[]) => void;
    disabled: boolean;
}

function TransactionLineEditor(props: TransactionLineEditorProps): React.ReactElement {
    if (props.lines.length === 0) {
        return <div>
            <p>No lines have been added. This will remove all lines from the transaction (total will remain the same).</p>
            <p>To set the total, you can use the "Set amount" action on the same transactions after removing the lines.</p>
            <div className="buttons mb-3 mt-1">
                <InputButton onClick={() => props.setLines([{ description: "Transaction line", amount: new Decimal(0) }])}>
                    Add lines
                </InputButton>
            </div>
        </div>;
    }

    return <>
        <table className="table is-fullwidth">
            <thead>
                <tr>
                    <th>Description</th>
                    <th className="has-text-right">Amount</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {props.lines.map((line, i) => <tr key={i}>
                    <td>
                        <InputText value={line.description}
                            onChange={e => props.setLines([
                                ...props.lines.slice(0, i),
                                { ...line, description: e.target.value },
                                ...props.lines.slice(i + 1)])}
                            disabled={props.disabled}
                        />
                    </td>
                    <td className="has-text-right">{
                        <InputNumber value={line.amount}
                            onChange={value => props.setLines([
                                ...props.lines.slice(0, i),
                                { ...line, amount: value },
                                ...props.lines.slice(i + 1)])}
                            allowNull={false}
                            disabled={props.disabled}
                        />
                    }</td>
                    <td style={{verticalAlign: "middle"}}>
                        <InputIconButton icon={faTrashCan} onClick={() => props.setLines(props.lines.filter((line, index) => index != i))} />
                    </td>
                </tr>)}
            </tbody>
        </table>
        <div className="buttons">
            <InputButton disabled={props.disabled}
                onClick={() => props.setLines([
                    ...props.lines,
                    {
                        description: "Transaction line",
                        amount: new Decimal(0)
                    }
                ])}>
                Add line
            </InputButton>
        </div>
    </>;
}