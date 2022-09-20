import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { useNavigate } from "react-router";
import { Api } from "../../../lib/ApiClient";
import { routes } from "../../../lib/routes";
import { formatNumberWithPrefs } from "../../../lib/Utils";
import { CreateTransaction, Transaction, TransactionLine } from "../../../models/transaction";
import InputAccount from "../../account/input/InputAccount";
import { preferencesContext } from "../../App";
import Card from "../../common/Card";
import InputButton from "../../input/InputButton";
import InputCategory from "../../input/InputCategory";
import InputDate from "../../input/InputDate";
import InputIconButton from "../../input/InputIconButton";
import InputNumber from "../../input/InputNumber";
import InputText from "../../input/InputText";
import InputTextOrNull from "../../input/InputTextOrNull";
import TransactionLink from "../../transaction/TransactionLink";

const defaultModel: CreateTransaction = {
    category: "",
    dateTime: DateTime.now(),
    description: "",
    destinationId: null,
    sourceId: null,
    identifier: null,
    lines: [],
    total: new Decimal(0),
};

export default function () {
    const [model, setModel] = React.useState<CreateTransaction>(defaultModel);
    const [creating, setCreating] = React.useState(false);
    const navigate = useNavigate();
    const allowBack = window.history.state.usr?.allowBack === true;
    const [createdTransaction, setCreatedTransaction] = React.useState<Transaction | null>();

    return <>
        <section className="hero has-background-info" style={{ flexDirection: "row", alignItems: "center" }}>
            <div className="hero-body">
                <p className="title has-text-white">
                    Create new transaction
                </p>
            </div>
        </section>
        <div className="p-3">
            <Card title="Create transaction" isNarrow={true}>
                { createdTransaction && <article className="message is-link">
                    <div className="message-body">
                        Transaction has been created: <TransactionLink transaction={createdTransaction} />
                    </div>
                </article>}

                <InputDate label="Timestamp"
                    value={model.dateTime}
                    onChange={value => setModel({ ...model, dateTime: value })}
                    fullwidth={false}
                    disabled={creating} />
                <InputTextOrNull label="Unique identifier"
                    value={model.identifier}
                    noValueText="Ignore duplicates"
                    onChange={value => setModel({ ...model, identifier: value })}
                    disabled={creating} />
                <InputNumber label={"Total"}
                    allowNull={false}
                    value={model.total}
                    disabled={model.lines.length > 0 || creating}
                    onChange={value => setModel({...model, total: new Decimal(value) })} />
                <InputText label="Description"
                    value={model.description}
                    onChange={e => setModel({ ...model, description: e.target.value })}
                    disabled={creating} />
                <div className="columns">
                    <div className="column is-6">
                        <InputAccount label="Source"
                            value={model.sourceId}
                            disabled={creating}
                            allowNull={true}
                            allowCreateNewAccount={true} 
                            onChange={account => setModel({ ...model, sourceId: account?.id ?? null})} />
                    </div>
                    <div className="column is-6">
                        <InputAccount label="Destination"
                            value={model.destinationId}
                            disabled={creating}
                            allowNull={true}
                            allowCreateNewAccount={true} 
                            onChange={account => setModel({ ...model, destinationId: account?.id ?? null})} />
                    </div>
                </div>
                <InputCategory label="Category"
                    value={model.category}
                    disabled={creating}
                    onChange={value => setModel({ ...model, category: value })} />
            </Card>

            <Card title="Transaction lines" isNarrow={true}>
                {model.lines.length === 0
                    ? < InputButton onClick={() => setModel({ ...model, lines: [{ description: "Transaction line", amount: model.total }] })}>
                        Split transaction
                    </InputButton>
                    : <>
                        {model.lines.map((line, i) => <div key={i} className="columns">
                            <div className="column is-3">
                                <InputNumber label={i == 0 ? "Amount" : undefined}
                                    allowNull={false}
                                    value={line.amount}
                                    onChange={value => updateLine(i, {
                                        ...model.lines[i],
                                        amount: new Decimal(value)
                                    })}
                                    disabled={creating} />
                            </div>
                            <div className="column">
                                <InputText label={i == 0 ? "Description" : undefined}
                                    value={line.description}
                                    onChange={e => updateLine(i, {
                                        ...model.lines[i],
                                        description: e.target.value
                                    })}
                                    disabled={creating} />
                            </div>
                            {model.lines.length !== 0 &&
                                <div className="column is-narrow">
                                    {i == 0 && <label className="label">&nbsp;</label>}
                                    <InputIconButton
                                        icon={faTrashCan}
                                        onClick={() => deleteLine(i)} />
                                </div>
                            }
                        </div>
                        )}
                        <div className="buttons">
                            <InputButton onClick={() => addLine()}>Add line</InputButton>
                        </div>
                    </>}
            </Card>

            <Card title="Actions" isNarrow={true}>
                <div className="buttons">
                    <InputButton className="is-primary" onClick={() => create("stay")}>Create and stay</InputButton>
                    <InputButton className="is-primary" onClick={() => create("view")}>Create and view transaction</InputButton>
                    {allowBack && <InputButton onClick={() => navigate(-1)}>Back</InputButton>}
                </div>
            </Card>
        </div>
    </>;

    function deleteLine(index: number) {
        const lines = [...model.lines.slice(0, index), ...model.lines.slice(index + 1)];
        setModel({
            ...model,
            lines,
            total: lines.length === 0 ? model.lines[index].amount : lines.reduce((sum, line) => sum.add(line.amount), new Decimal(0))
        });
    }
    
    function addLine() {
        setModel({
            ...model,
            lines: [
                ...model.lines,
                {
                    amount: new Decimal(0),
                    description: "Transaction line"
                }
            ]
        });
    }

    function updateLine(index: number, newLine: TransactionLine) {
        const lines = [
            ...model.lines.slice(0, index),
            newLine,
            ...model.lines.slice(index + 1)];
        setModel({
            ...model,
            lines,
            total: lines.reduce((sum, line) => sum.add(line.amount), new Decimal(0))
        });
    }

    async function create(action: "stay" | "view") {
        setCreating(true);
        setCreatedTransaction(null);
        const result = await Api.Transaction.create(model);
        if (action === "stay") {
            setModel(defaultModel);
            setCreating(false);
            setCreatedTransaction(result);
        } else {
            navigate(routes.transaction(result.id.toString()));
        }
    }
}
