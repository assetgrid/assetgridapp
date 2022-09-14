import axios from "axios";
import Decimal from "decimal.js";
import * as React from "react";
import { Link } from "react-router-dom";
import { Api } from "../../lib/ApiClient";
import { routes } from "../../lib/routes";
import { formatNumber, formatNumberWithPrefs } from "../../lib/Utils";
import { Preferences } from "../../models/preferences";
import { preferencesContext } from "../App";
import { Card } from "../common/Card";
import InputButton from "../form/InputButton";
import InputNumber from "../form/InputNumber";
import InputText from "../form/InputText";

export default function PagePreferences(): React.ReactElement {
    const { preferences, updatePreferences } = React.useContext(preferencesContext);
    const [model, setModel] = React.useState<Preferences | "fetching">(preferences);
    const [isUpdating, setIsUpdating] = React.useState(false);

    React.useEffect(() => {
        // Whenever global preferences change, update this component to match
        if (preferences !== "fetching") {
            setModel(preferences);
        }
    }, [preferences]);

    if (model === "fetching") {
        // This will only be shown until the global preferences are loaded.
        // Then the model will be set and will never be "fetching again"
        return <>Please wait</>;
    }

    return <>
        <section className="hero has-background-primary">
            <div className="hero-body">
                <p className="title has-text-white">
                    Preferences
                </p>
            </div>
        </section>

        <div className="p-3">
            <Card title="Number formatting">
                <div className="columns">
                    <div className="column">
                        <InputText value={model.decimalSeparator}
                            disabled={isUpdating}
                            label="Decimal Separator"
                            onChange={(event => setModel({
                                ...model,
                                decimalSeparator: event.target.value
                            }))} />
                    </div>
                    <div className="column">
                        <InputText value={model.thousandsSeparator}
                            disabled={isUpdating}
                            label="Thousands Separator"
                            onChange={(event => setModel({
                                ...model,
                                thousandsSeparator: event.target.value
                            }))} />
                    </div>
                    <div className="column">
                        <InputNumber value={new Decimal(model.decimalDigits)}
                            disabled={isUpdating}
                            label="Digits after decimal point"
                            allowNull={false}
                            onChange={(value => setModel({
                                ...model,
                                decimalDigits: Math.max(0, Math.min(value.round().toNumber(), 4))
                            }))} />
                    </div>
                </div>
                
                <p>Example: {
                    formatNumberWithPrefs(new Decimal("123456789.123456789"), model)}
                </p>
                
                <InputButton
                    disabled={isUpdating}
                    className="is-primary"
                    onClick={saveChanges}>
                    Save changes
                </InputButton>
            </Card>
        </div>
    </>;

    function saveChanges() {
        if (isUpdating || model === "fetching") {
            return;
        }

        setIsUpdating(true);
        Api.Preferences.update(model)
            .then(result => {
                setIsUpdating(false);

                if (preferences === "fetching") {
                    updatePreferences(null);
                } else {
                    const { favoriteAccounts, ...updatedPreferences } = result;
                    updatePreferences({ ...preferences, ...updatedPreferences });
                }
            })
            .catch(e => {
                console.log(e);
                setIsUpdating(false);
            });
    }
}