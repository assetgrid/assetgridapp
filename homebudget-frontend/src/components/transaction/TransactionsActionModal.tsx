import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { Api } from "../../lib/ApiClient";
import { SearchGroup, SearchQuery } from "../../models/search";
import { Transaction, UpdateTransaction } from "../../models/transaction";
import Modal from "../common/Modal";
import InputAccount from "../form/account/InputAccount";
import InputButton from "../form/InputButton";
import InputCategory from "../form/InputCategory";
import InputDate from "../form/InputDate";
import InputNumber from "../form/InputNumber";
import InputSelect from "../form/InputSelect";
import InputText from "../form/InputText";
import TransactionList from "./TransactionList";

interface Props {
    close: () => void;
    closeOnChange?: boolean;
    updated: () => void;
    query: SearchGroup;
}

const actions = [
    { key: "set-datetime", value: "Set timestamp" },
    { key: "set-description", value: "Set description" },
    { key: "set-amount", value: "Set amount" },
    { key: "set-lines", value: "Set lines" },
    { key: "set-source", value: "Set source account" },
    { key: "set-destination", value: "Set destination account" },
    { key: "set-category", value: "Set category" },
] as const;
type Action = typeof actions[number]['key'];

export default function TransactionsActionModal(props: Props) {
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [action, setAction] = React.useState<Action | null>(null);
    const [draw, setDraw] = React.useState(0);
    const [model, setModel] = React.useState<UpdateTransaction | null>(null);

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
                setModel({ lines: [] });
                break;
        }
    }, [action]);

    return <Modal
        active={true}
        title={"Modify multiple transactions"}
        close={() => props.close()}
        footer={<>
            <InputButton className="is-success" onClick={() => update()} disabled={isUpdating || model === null}>Apply changes</InputButton>
            <InputButton onClick={() => props.close()}>Cancel</InputButton>
        </>}>
        
        {renderAction(action, setAction, model, setModel, isUpdating)}

        <hr className="mb-3 mt-3"/>

        <p>The following transactions will be modified:</p>
        <TransactionList draw={draw} allowEditing={false} allowLinks={false} query={props.query} small={true} pageSize={5} />
    </Modal>;

    async function update() {
        setIsUpdating(true);
        if (model === null) {
            return;
        }

        await Api.Transaction.updateMultiple(props.query, model);
        setIsUpdating(false);
        props.updated && props.updated();
        if (props.closeOnChange) {
            props.close();
        } else {
            setDraw(draw => draw + 1);
        }
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

    switch (action) {
        case "set-lines":
            return <InputSelect
                label="Action"
                items={[...actions]}
                value={action}
                onChange={value => setAction(value as Action)}></InputSelect>;
        case "set-datetime":
        case "set-description":
        case "set-destination":
        case "set-category":
        case "set-source":
            return <div className="columns">
                <div className="column">
                    <InputSelect
                        disabled={disabled}
                        label="Action"
                        items={[...actions]}
                        value={action}
                        onChange={value => setAction(value as Action)}></InputSelect>
                </div>
                <div className="column">{renderActionValue(action, model, setModel, disabled)}</div>
            </div>
        case "set-amount":
            return <><div className="columns">
                    <div className="column">
                        <InputSelect
                            disabled={disabled}
                            label="Action"
                            items={[...actions]}
                            value={action}
                            onChange={value => setAction(value as Action)}></InputSelect>
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
            return <InputDate label="Select timestamp"
                disabled={disabled}
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