using assetgrid_backend.Models.ViewModels;
using assetgrid_backend.Models;
using System.Linq.Expressions;
using System.Text.Json;
using assetgrid_backend.models.Search;

namespace assetgrid_backend.Data
{
    public static class DataExtensionMethods
    {
        #region Search

        public static Expression? SearchGroupToExpression(SearchGroup group, Dictionary<string, Func<SearchQuery, Expression, Expression>> columnExpressions, Expression parameter)
        {
            Expression? result = null;
            switch (group.Type)
            {
                case SearchGroupType.Query:
                    if (group.Query == null)
                    {
                        throw new Exception("Query must be specified");
                    }
                    if (! columnExpressions.ContainsKey(group.Query.Column))
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
                            result = SearchGroupToExpression(child, columnExpressions, parameter);
                        }
                        else
                        {
                            var otherExpression = SearchGroupToExpression(child, columnExpressions, parameter);
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
                            result = SearchGroupToExpression(child, columnExpressions, parameter);
                        }
                        else
                        {
                            var otherExpression = SearchGroupToExpression(child, columnExpressions, parameter);
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

        #endregion

        #region Transaction
        public static IQueryable<ViewTransaction> SelectView(this IQueryable<Transaction> query, int userId)
        {
            return query.Select(transaction => new ViewTransaction
            {
                Id = transaction.Id,
                DateTime = transaction.DateTime,
                Description = transaction.Description,
                IsSplit = transaction.IsSplit,
                Source = transaction.SourceAccount == null ? null
                        : !transaction.SourceAccount.Users!.Any(user => user.UserId == userId) ? ViewAccount.GetNoReadAccess(transaction.SourceAccount.Id)
                            : new ViewAccount(
                                transaction.SourceAccount.Id,
                                transaction.SourceAccount.Name,
                                transaction.SourceAccount.Description,
                                // We don't include identifiers on transactions because it is unnecessary and because it fails during testing with MemoryDb
                                new List<string>(),
                                // transaction.SourceAccount.Identifiers!.Select(x => x.Identifier).ToList(),
                                transaction.SourceAccount.Users!.Single(user => user.UserId == userId).Favorite,
                                transaction.SourceAccount.Users!.Single(user => user.UserId == userId).IncludeInNetWorth,
                                ViewAccount.PermissionsFromDbPermissions(transaction.SourceAccount.Users!.Single(user => user.UserId == userId).Permissions),
                                0),
                Destination = transaction.DestinationAccount == null ? null
                        : !transaction.DestinationAccount.Users!.Any(user => user.UserId == userId) ? ViewAccount.GetNoReadAccess(transaction.DestinationAccount.Id)
                            : new ViewAccount(
                                transaction.DestinationAccount.Id,
                                transaction.DestinationAccount.Name,
                                transaction.DestinationAccount.Description,
                                // We don't include identifiers on transactions because it is unnecessary and because it fails during testing with MemoryDb
                                new List<string>(),
                                // transaction.DestinationAccount.Identifiers!.Select(x => x.Identifier).ToList(),
                                transaction.DestinationAccount.Users!.Single(user => user.UserId == userId).Favorite,
                                transaction.DestinationAccount.Users!.Single(user => user.UserId == userId).IncludeInNetWorth,
                                ViewAccount.PermissionsFromDbPermissions(transaction.DestinationAccount.Users!.Single(user => user.UserId == userId).Permissions),
                                0),
                Identifiers = transaction.Identifiers.Select(x => x.Identifier).ToList(),
                Lines = transaction.TransactionLines
                    .OrderBy(line => line.Order)
                    .Select(line => new ViewTransactionLine(line.Amount, line.Description, line.Category))
                    .ToList(),
                Total = transaction.TransactionLines.Select(line => line.Amount).Sum()
            });
        }

        #endregion

        #region Account
        public static IQueryable<ViewAccount> SelectView(this IQueryable<UserAccount> query)
        {
            return query.Select(account => new ViewAccount(
                account.AccountId,
                account.Account.Name,
                account.Account.Description,
                account.Account.Identifiers!.Select(x => x.Identifier).ToList(),
                account.Favorite,
                account.IncludeInNetWorth,
                (ViewAccount.AccountPermissions)(account.Permissions + 1),
                0
            ));
        }

        #endregion
    }
}
