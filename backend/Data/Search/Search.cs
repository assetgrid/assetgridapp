using assetgrid_backend.models.MetaFields;
using assetgrid_backend.models.Search;
using System.Linq.Expressions;
using System.Text.Json;

namespace assetgrid_backend.Data.Search
{
    public class Search
    {
        public static Expression? SearchGroupToExpression<T>(
            SearchGroup group,
            Dictionary<string, Func<SearchQuery, Expression, Expression>> columnExpressions,
            Expression parameter,
            Dictionary<int, MetaField> metaData)
        {
            Expression? result = null;
            switch (group.Type)
            {
                case SearchGroupType.Query:
                    if (group.Query == null)
                    {
                        throw new Exception("Query must be specified");
                    }
                    if (group.Query.MetaData)
                    {
                        return MetaExpression<T>(group.Query, parameter, metaData);
                    }
                    if (!columnExpressions.ContainsKey(group.Query.Column))
                    {
                        throw new Exception($"Invalid column '{group.Query.Column}'");
                    }

                    return columnExpressions[group.Query.Column](group.Query, parameter);

                case SearchGroupType.And:
                    if (group.Children == null)
                    {
                        throw new Exception("Children must not be null with operator 'and'");
                    }
                    foreach (var child in group.Children)
                    {
                        if (result == null)
                        {
                            result = SearchGroupToExpression<T>(child, columnExpressions, parameter, metaData);
                        }
                        else
                        {
                            var otherExpression = SearchGroupToExpression<T>(child, columnExpressions, parameter, metaData);
                            if (otherExpression != null)
                            {
                                result = Expression.AndAlso(result, otherExpression);
                            }
                        }
                    }
                    return result;

                case SearchGroupType.Or:
                    if (group.Children == null)
                    {
                        throw new Exception("Children must not be null with operator 'or'");
                    }
                    foreach (var child in group.Children)
                    {
                        if (result == null)
                        {
                            result = SearchGroupToExpression<T>(child, columnExpressions, parameter, metaData);
                        }
                        else
                        {
                            var otherExpression = SearchGroupToExpression<T>(child, columnExpressions, parameter, metaData);
                            if (otherExpression != null)
                            {
                                result = Expression.OrElse(result, otherExpression);
                            }
                        }
                    }
                    return result;

                default:
                    throw new Exception($"Unknown group type '{group.Type}'");
            }
        }

        #region MetaData

        public static Expression MetaExpression<T>(SearchQuery query, Expression parameter, Dictionary<int, MetaField> metaData)
        {
            if (! int.TryParse(query.Column, out int metaId))
            {
                throw new Exception($"Cannot parse metadata ID '{query.Column}'");
            }
            if (! metaData.TryGetValue(metaId, out MetaField? metaField) || metaField == null)
            {
                throw new Exception($"No metadata with ID '{metaId}'");
            }

            var (valuePropertyName, metaType) = metaField.ValueType switch
            {
                MetaFieldValueType.TextLine => ("MetaTextLineValues", typeof(MetaTextLine<T>)),
                MetaFieldValueType.TextLong => ("MetaTextLongValues", typeof(MetaTextLong<T>)),
                MetaFieldValueType.Number => ("MetaNumberValues", typeof(MetaNumber<T>)),
                MetaFieldValueType.Transaction => ("MetaTransactionValues", typeof(MetaTransaction<T>)),
                MetaFieldValueType.Account => ("MetaAccountValues", typeof(MetaAccount<T>)),
                MetaFieldValueType.Attachment => ("MetaAttachmentValues", typeof(MetaAttachment<T>)),
                MetaFieldValueType.Boolean => ("MetaBooleanValues", typeof(MetaBoolean<T>)),
                _ => throw new Exception("Unknown meta field type")
            };
            var singleOrDefaultMethod = typeof(Enumerable)
                .GetMethods()
                .Single(method => method.Name == "SingleOrDefault" &&
                    method.GetParameters().Length == 2 &&
                    method.GetParameters()[1].Name == "predicate")
                .MakeGenericMethod(metaType);
            var innerParameter = Expression.Parameter(metaType);
            var innerExpression = Expression.Lambda(Expression.Equal(Expression.Property(innerParameter, "ObjectId"), Expression.Property(parameter, "Id")), innerParameter);

            var metaValue = Expression.Call(
                // transaction.{valueProperty}.SingleOrDefault(x => x.ObjectId == transaction.Id)
                null,
                singleOrDefaultMethod,
                Expression.Property(parameter, valuePropertyName),
                innerExpression);

            if (query.Operator == SearchOperator.IsNull)
            {
                if (query.Not)
                {
                    return Expression.NotEqual(metaValue, Expression.Constant(null));
                }
                return Expression.Equal(metaValue, Expression.Constant(null));
            }

            switch (metaField.ValueType)
            {
                case MetaFieldValueType.TextLine:
                    if (query.Not)
                    {
                        return Expression.OrElse(
                            Expression.Equal(metaValue, Expression.Constant(null)),
                            StringExpression(query, false, Expression.Property(metaValue, "Value")));
                    }
                    return Expression.AndAlso(
                        Expression.NotEqual(metaValue, Expression.Constant(null)),
                        StringExpression(query, false, Expression.Property(metaValue, "Value")));
                case MetaFieldValueType.Number:
                    if (query.Not)
                    {
                        return Expression.OrElse(
                            Expression.Equal(metaValue, Expression.Constant(null)),
                            NumericExpression(query, typeof(long), false, Expression.Property(metaValue, "Value")));
                    }
                    return Expression.AndAlso(
                        Expression.NotEqual(metaValue, Expression.Constant(null)),
                        NumericExpression(query, typeof(long), false, Expression.Property(metaValue, "Value")));
                case MetaFieldValueType.Transaction:
                case MetaFieldValueType.Account:
                    if (query.Value == null)
                    {
                        if (query.Not)
                        {
                            return Expression.NotEqual(metaValue, Expression.Constant(null));
                        }
                        return Expression.Equal(metaValue, Expression.Constant(null));
                    }

                    if (query.Not)
                    {
                        return Expression.OrElse(
                            Expression.Equal(metaValue, Expression.Constant(null)),
                            NumericExpression(query, typeof(int), false, Expression.Property(metaValue, "ValueId")));
                    }
                    return Expression.AndAlso(
                        Expression.NotEqual(metaValue, Expression.Constant(null)),
                        NumericExpression(query, typeof(int), false, Expression.Property(metaValue, "ValueId")));
                case MetaFieldValueType.Boolean:
                    var value = query.Value switch
                    {
                        JsonElement x => x.GetBoolean(),
                        bool x => x,
                        _ => throw new Exception("Invalid value type for field of type boolean")
                    };
                    if (query.Not ^ value)
                    {
                        return Expression.NotEqual(metaValue, Expression.Constant(null));
                    }
                    return Expression.Equal(metaValue, Expression.Constant(null));
            }

            throw new Exception("Unknown meta field");
        }

        #endregion

        #region Generic column expression handlers

        public static Expression StringExpression(SearchQuery query, bool allowNull, Expression parameter)
        {
            Expression result;
            switch (query.Operator)
            {
                case SearchOperator.Equals:
                case SearchOperator.Contains:
                    {
                        /*
                        * First parse the JSON value into the correct type
                        */
                        if (query.Value == null && !allowNull)
                        {
                            throw new Exception($"Operator '{query.Operator}' expects value of type 'string' but received type null");
                        }
                        if (query.Value != null && query.Value is not string && ((JsonElement)query.Value).ValueKind != JsonValueKind.String)
                        {
                            throw new Exception($"Operator '{query.Operator}' expects value of type 'string' but received type {((JsonElement)query.Value).ValueKind}");
                        }
                        var value = query.Value != null ? (query.Value is string ? (string)query.Value : ((JsonElement)query.Value).GetString())?.ToUpper() : null;
                        // {object}.{column}.ToUpper() for case insensitive string comparisons
                        var upperCaseParameter = Expression.Call(parameter, typeof(string).GetMethod("ToUpper", new Type[] { })!);

                        /*
                        * Then generate the expression
                        */
                        switch (query.Operator)
                        {
                            case SearchOperator.Equals:
                                result = Expression.Equal(upperCaseParameter, Expression.Constant(value));
                                break;
                            case SearchOperator.Contains:
                                result = Expression.Call(
                                        // Call method Contains on the column with the value as the parameter
                                        upperCaseParameter,
                                        typeof(string).GetMethod("Contains", new[] { typeof(string) })!,
                                        Expression.Constant(value));
                                break;
                            default:
                                throw new Exception("Unknown operator");
                        }
                        break;
                    }
                case SearchOperator.In:
                    {
                        /*
                         * First parse the JSON value into the correct type
                         */
                        if (query.Value == null)
                        {
                            throw new Exception($"Operator '{query.Operator}' expects value of type 'string array' but received type null");
                        }
                        if (((JsonElement)query.Value).ValueKind != JsonValueKind.Array)
                        {
                            throw new Exception($"Operator '{query.Operator}' expects value of type 'string array' but received type {((JsonElement)query.Value).ValueKind}");
                        }

                        var value = ((JsonElement)query.Value).EnumerateArray().Select(obj => obj.GetString()?.ToUpper()).ToArray();

                        /*
                         * Then generate the expression
                         */
                        var containsMethod = typeof(Enumerable)
                                        .GetMethods()
                                        .Single(method => method.Name == "Contains" &&
                                            method.GetParameters().Length == 2 &&
                                            method.GetParameters()[1].Name == "value")
                                        .MakeGenericMethod(typeof(string));
                        result = Expression.Call(
                            // Call method Contains on the column with the value as the parameter
                            null,
                            containsMethod,
                            Expression.Constant(value),
                            Expression.Call(parameter, typeof(string).GetMethod("ToUpper", new Type[] { })!));
                        break;
                    }
                default:
                    throw new Exception($"Operator '{query.Operator}' is not valid for column '{query.Column}'");
            }

            if (query.Not)
            {
                return Expression.Not(result);
            }
            else
            {
                return result;
            }
        }

        public static Expression NumericExpression(SearchQuery query, Type numericType, bool allowNull, Expression parameter)
        {
            Expression result;
            switch (query.Operator)
            {
                case SearchOperator.Equals:
                case SearchOperator.GreaterThanOrEqual:
                case SearchOperator.GreaterThan:
                    /*
                     * First parse the JSON value into the correct type
                     */
                    object? value = query.Value;
                    JsonValueKind? valueKind = value != null ? ((JsonElement)value).ValueKind : null;
                    if (value == null && !allowNull)
                    {
                        throw new Exception($"Operator '{query.Operator}' expects value of type '{numericType}' but received type null");
                    }

                    if (valueKind != null && value != null)
                    {
                        // Dates must be sent as string
                        if ((numericType == typeof(DateTime) && valueKind != JsonValueKind.String) ||
                            // Numbers may be sent as a json number or a string to prevent floating point errors
                            (numericType != typeof(DateTime) && valueKind != JsonValueKind.Number && valueKind != JsonValueKind.String))
                        {
                            throw new Exception($"Operator '{query.Operator}' expects value of type '{numericType}' but received type {valueKind}");
                        }

                        if (value is JsonElement)
                        {
                            if (numericType == typeof(int) || numericType == typeof(int?))
                            {
                                if (valueKind == JsonValueKind.String)
                                {
                                    value = int.Parse(((JsonElement)value).GetString() ?? "");
                                }
                                else
                                {
                                    value = ((JsonElement)value).GetInt32();
                                }
                            }
                            else if (numericType == typeof(long) || numericType == typeof(long?))
                            {
                                if (valueKind == JsonValueKind.String)
                                {
                                    value = long.Parse(((JsonElement)value).GetString() ?? "");
                                }
                                else
                                {
                                    value = ((JsonElement)value).GetInt64();
                                }
                            }
                            else if (numericType == typeof(decimal) || numericType == typeof(decimal?))
                            {
                                if (valueKind == JsonValueKind.String)
                                {
                                    value = decimal.Parse(((JsonElement)value).GetString() ?? "");
                                }
                                else
                                {
                                    value = ((JsonElement)value).GetDecimal();
                                }
                            }
                            else if (numericType == typeof(DateTime))
                            {
                                value = ((JsonElement)value).GetDateTime();
                            }
                            else
                            {
                                throw new Exception($"Type '{numericType}' is not a valid numeric type");
                            }
                        }
                    }

                    /*
                     * Then generate the expression
                     */
                    switch (query.Operator)
                    {
                        case SearchOperator.Equals:
                            result = Expression.Equal(parameter, Expression.Constant(value, numericType));
                            break;
                        case SearchOperator.GreaterThan:
                            result = Expression.GreaterThan(parameter, Expression.Constant(value, numericType));
                            break;
                        case SearchOperator.GreaterThanOrEqual:
                            result = Expression.GreaterThanOrEqual(parameter, Expression.Constant(value, numericType));
                            break;
                        default:
                            throw new Exception("Unknown operator");
                    }
                    break;
                case SearchOperator.In:
                    /*
                     * First parse the JSON value into the correct type
                     */
                    if (query.Value == null)
                    {
                        throw new Exception($"Operator '{query.Operator}' expects value of type '{numericType}' array but received type null");
                    }
                    if (((JsonElement)query.Value).ValueKind != JsonValueKind.Array)
                    {
                        throw new Exception($"Operator '{query.Operator}' expects value of type '{numericType}' array but received type {((JsonElement)query.Value).ValueKind}");
                    }

                    if (numericType == typeof(int))
                    {
                        value = ((JsonElement)query.Value).EnumerateArray().Select(obj => obj.ValueKind == JsonValueKind.Number
                                                                                            ? obj.GetInt32()
                                                                                            : int.Parse(obj.GetString() ?? "")).ToArray();
                    }
                    else if (numericType == typeof(long))
                    {
                        value = ((JsonElement)query.Value).EnumerateArray().Select(obj => obj.ValueKind == JsonValueKind.Number
                                                                                            ? obj.GetInt64()
                                                                                            : long.Parse(obj.GetString() ?? "")).ToArray();
                    }
                    else if (numericType == typeof(decimal))
                    {
                        value = ((JsonElement)query.Value).EnumerateArray().Select(obj => obj.ValueKind == JsonValueKind.Number
                                                                                            ? obj.GetDecimal()
                                                                                            : decimal.Parse(obj.GetString() ?? "")).ToArray();
                    }
                    else if (numericType == typeof(DateTime))
                    {
                        value = ((JsonElement)query.Value).EnumerateArray().Select(obj => obj.GetDateTime()).ToArray();
                    }
                    else
                    {
                        throw new Exception($"Type '{numericType}' is not a valid numeric type");
                    }

                    /*
                     * Then generate the expression
                     */
                    var method = typeof(Enumerable)
                                    .GetMethods()
                                    .Single(method => method.Name == "Contains" &&
                                        method.GetParameters().Length == 2 &&
                                        method.GetParameters()[1].Name == "value")
                                    .MakeGenericMethod(numericType);
                    result = Expression.Call(
                        // Call method Contains on the column with the value as the parameter
                        null,
                        method,
                        Expression.Constant(value),
                        parameter);
                    break;
                default:
                    throw new Exception($"Operator '{query.Operator}' is not valid for column '{query.Column}'");
            }

            if (query.Not)
            {
                return Expression.Not(result);
            }
            else
            {
                return result;
            }
        }

        public static Expression BooleanExpression(SearchQuery query, Expression parameter)
        {
            Expression result;
            switch (query.Operator)
            {
                case SearchOperator.Equals:
                    /*
                     * First parse the JSON value into the correct type
                     */
                    if (query.Value == null)
                    {
                        throw new Exception($"Operator '{query.Operator}' expects value of type 'boolean' but received type null");
                    }
                    var value = ((JsonElement)query.Value).GetBoolean();
                    result = Expression.Equal(parameter, Expression.Constant(value, typeof(bool)));
                    break;
                default:
                    throw new Exception($"Operator '{query.Operator}' is not valid for column '{query.Column}'");
            }

            if (query.Not)
            {
                return Expression.Not(result);
            }
            else
            {
                return result;
            }
        }

        #endregion
    }
}
