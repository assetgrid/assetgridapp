using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using System.Linq.Expressions;
using System.Text.Json;

namespace assetgrid_backend.Data
{
    public static class DataExtensionMethods
    {
        public static IQueryable<UserAccount> ApplySearch(this IQueryable<UserAccount> items, ViewSearch query, bool applyOrder)
        {
            var columns = new[] {
                ("Id", typeof(int), false),
                ("Name", typeof(string), false),
                ("Description", typeof(string), false),
                ("AccountNumber", typeof(string), false)
            };
            var parameter = Expression.Parameter(typeof(UserAccount), "account");
            var property = Expression.Property(parameter, "Account");

            if (query.Query != null)
            {
                var expression = SearchGroupToExpression(query.Query, columns, property);
                if (expression != null)
                {
                    return items.Where(Expression.Lambda<Func<UserAccount, bool>>(expression, parameter));
                }
            }

            if (applyOrder && query.OrderByColumn != null)
            {
                // Construct expression to invoke OrderBy or OrderByDescending with the specified ordering
                var orderColumn = query.OrderByColumn;
                var orderColumnType = columns.First(column => column.Item1 == orderColumn).Item2;
                string command = (query.Descending ?? false) ? "OrderByDescending" : "OrderBy";
                var orderByExpression = Expression.Lambda(Expression.Property(property, orderColumn), parameter);
                var resultExpression = Expression.Call(typeof(Queryable), command, new Type[] { typeof(UserAccount), orderColumnType },
                                              items.Expression, Expression.Quote(orderByExpression));
                items = items.Provider.CreateQuery<UserAccount>(resultExpression);
            }

            return items;
        }

        public static IQueryable<Transaction> ApplySearch(this IQueryable<Transaction> items, ViewSearch query, bool applyOrder)
        {
            var columns = new[] {
                ("Id", typeof(int), false),
                ("SourceAccountId", typeof(int), true),
                ("DestinationAccountId", typeof(int), true),
                ("Identifier", typeof(string), false),
                ("Description", typeof(string), false),
                ("Category", typeof(string), false),
                ("DateTime", typeof(DateTime), false),
                ("Total", typeof(long), true),
            };
            var parameter = Expression.Parameter(typeof(Transaction), "transaction");

            if (query.Query != null)
            {
                var expression = SearchGroupToExpression(query.Query, columns, parameter);
                if (expression != null)
                {
                    items = items.Where(Expression.Lambda<Func<Transaction, bool>>(expression, parameter));
                }
            }

            if (applyOrder && query.OrderByColumn != null)
            {
                // Construct expression to invoke OrderBy or OrderByDescending with the specified ordering
                var orderColumn = query.OrderByColumn;
                var orderColumnType = columns.First(column => column.Item1 == orderColumn).Item2;
                string command = (query.Descending ?? false) ? "OrderByDescending" : "OrderBy";
                var property = Expression.Property(parameter, orderColumn);
                if (query.OrderByColumn == "Category")
                {
                    property = Expression.Property(property, "Name");
                }
                if (query.OrderByColumn == "SourceAccountId" || query.OrderByColumn == "DestinationAccountId")
                {
                    property = Expression.Property(Expression.Property(parameter, query.OrderByColumn.Substring(0, query.OrderByColumn.Length - 2)), "Id");
                }
                var orderByExpression = Expression.Lambda(property, parameter);
                var resultExpression = Expression.Call(typeof(Queryable), command, new Type[] { typeof(Transaction), orderColumnType },
                                              items.Expression, Expression.Quote(orderByExpression));
                items = items.Provider.CreateQuery<Transaction>(resultExpression);
            }

            return items;
        }

        /// <summary>
        /// Applies a search group but does not apply ordering
        /// </summary>
        public static IQueryable<Transaction> ApplySearch(this IQueryable<Transaction> items, ViewSearchGroup? query)
        {
            if (query == null) return items;

            return items.ApplySearch(new ViewSearch
            {
                Descending = null,
                From = 0,
                To = 0,
                OrderByColumn = null,
                Query = query,
            }, false);
        }

        private static Expression? SearchGroupToExpression(ViewSearchGroup group, (string name, Type type, bool allowNull)[] columns, Expression parameter)
        {
            Expression? result = null;
            switch (group.Type)
            { 
                case ViewSearchGroupType.Query:
                    if (group.Query == null)
                    {
                        throw new Exception("Query must be specified");
                    }
                    if (!columns.Any(column => column.name == group.Query.Column))
                    {
                        throw new Exception($"Invalid column '{group.Query.Column}'");
                    }

                    var column = columns.First(column => column.name == group.Query.Column);
                    var columnValue = group.Query.Value != null ? CastJsonElement((JsonElement)group.Query.Value, column.type) : null;
                    MemberExpression property = Expression.Property(parameter, group.Query.Column);
                    if (column.name == "Category")
                    {
                        property = Expression.Property(property, "NormalizedName");
                    }

                    switch (group.Query.Operator)
                    {
                        case ViewSearchOperator.Equals:
                            if (columnValue == null && ! column.allowNull)
                            {
                                throw new Exception($"Operator '{group.Query.Operator}' expects value of type '{column.type}' but received type null");
                            }
                            if (columnValue != null && columnValue.GetType() != column.type)
                            {
                                throw new Exception($"Operator '{group.Query.Operator}' expects value of type '{column.type}' but received type {columnValue.GetType()}");
                            }

                            // Categories should be handled separately as "" means null
                            if (column.name == "Category" && ((string?)columnValue ?? "") == "")
                            {
                                result = Expression.Equal(Expression.Property(parameter, "CategoryId"), Expression.Constant(null));
                            }
                            else
                            {
                                result = Expression.Equal(property, Expression.Constant(columnValue, property.Type));
                            }
                            break;

                        case ViewSearchOperator.Contains:
                            if (columnValue == null)
                            {
                                throw new Exception($"Operator '{group.Query.Operator}' expects value of type '{column.type}' but received type null");
                            }

                            if (columnValue.GetType() == typeof(string))
                            {
                                if (string.IsNullOrEmpty((string)columnValue))
                                {
                                    return Expression.Constant(false);
                                }

                                result = Expression.Call(
                                    // Call method Contains on the column with the value as the parameter
                                    property,
                                    typeof(string).GetMethod("Contains", new[] { typeof(string) })!,
                                    Expression.Constant(columnValue)
                                    );
                                if (column.name == "Category" && group.Query.Not)
                                {
                                    // For "does not contain" queries on categories, those without a category should be included as well
                                    result = Expression.AndAlso(Expression.NotEqual(Expression.Property(parameter, "CategoryId"), Expression.Constant(null)), result);
                                }
                                break;
                            }
                            else
                            {
                                throw new Exception($"Operator '{group.Query.Operator}' does not accept type {columnValue.GetType()}");
                            }

                        case ViewSearchOperator.In:
                            if (columnValue == null)
                            {
                                throw new Exception($"Operator '{group.Query.Operator}' expects value of type '{column.type}' but received type null");
                            }

                            if (columnValue.GetType().IsArray && columnValue.GetType().GetElementType() == column.type)
                            {
                                var method = typeof(Enumerable)
                                    .GetMethods()
                                    .Single(method => method.Name == "Contains" &&
                                        method.GetParameters().Length == 2 &&
                                        method.GetParameters()[1].Name == "value")
                                    .MakeGenericMethod(column.type);
                                result = Expression.Call(
                                    // Call method Contains on the column with the value as the parameter
                                    null,
                                    method,
                                    Expression.Constant(columnValue),
                                    property
                                    );
                                break;
                            }
                            else
                            {
                                throw new Exception($"Operator '{group.Query.Operator}' does not accept type {columnValue.GetType()}");
                            }
                        case ViewSearchOperator.GreaterThan:
                            if (columnValue == null)
                            {
                                throw new Exception($"Operator '{group.Query.Operator}' expects value of type '{column.type}' but received type null");
                            }

                            if (columnValue.GetType() != column.type)
                            {
                                throw new Exception($"Operator '{group.Query.Operator}' expects value of type '{column.type}' but received type {columnValue.GetType()}");
                            }
                            result = Expression.GreaterThan(property, Expression.Constant(columnValue));
                            break;
                        case ViewSearchOperator.GreaterThanOrEqual:
                            if (columnValue == null)
                            {
                                throw new Exception($"Operator '{group.Query.Operator}' expects value of type '{column.type}' but received type null");
                            }

                            if (columnValue.GetType() != column.type)
                            {
                                throw new Exception($"Operator '{group.Query.Operator}' expects value of type '{column.type}' but received type {columnValue.GetType()}");
                            }
                            result = Expression.GreaterThanOrEqual(property, Expression.Constant(columnValue));
                            break;
                        default:
                            throw new Exception($"Unknown search operator '{group.Query.Operator}'");
                    }
                    
                    if (group.Query.Not)
                    {
                        return Expression.Not(result);
                    }
                    else
                    {
                        return result;
                    }

                case ViewSearchGroupType.And:
                    if (group.Children == null)
                    {
                        throw new Exception("Children must not be null with operator 'and'");
                    }
                    foreach (var child in group.Children)
                    {
                        if (result == null)
                        {
                            result = SearchGroupToExpression(child, columns, parameter);
                        }
                        else
                        {
                            var otherExpression = SearchGroupToExpression(child, columns, parameter);
                            if (otherExpression != null)
                            {
                                result = Expression.AndAlso(result, otherExpression);
                            }
                        }
                    }
                    return result;

                case ViewSearchGroupType.Or:
                    if (group.Children == null)
                    {
                        throw new Exception("Children must not be null with operator 'or'");
                    }
                    foreach (var child in group.Children)
                    {
                        if (result == null)
                        {
                            result = SearchGroupToExpression(child, columns, parameter);
                        }
                        else
                        {
                            var otherExpression = SearchGroupToExpression(child, columns, parameter);
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

        private static object CastJsonElement(JsonElement element, Type preferType)
        {
            if (element.ValueKind == JsonValueKind.String)
            {
                if (preferType == typeof(DateTime))
                {
                    return element.GetDateTime();
                }

                return element.GetString()!;
            }
            if (element.ValueKind == JsonValueKind.Number)
            {
                if (preferType == typeof(int))
                {
                    return element.GetInt32();
                }
                else if (preferType == typeof(long))
                {
                    return element.GetInt64();
                }
                else
                {
                    return element.GetDecimal();
                }
            }
            if (element.ValueKind == JsonValueKind.Array)
            {
                if (preferType == typeof(int))
                {
                    return element.EnumerateArray().Select(obj => obj.GetInt32()).ToArray();
                }
                if (preferType == typeof(long))
                {
                    return element.EnumerateArray().Select(obj => obj.GetInt64()).ToArray();
                }
                if (preferType == typeof(string))
                {
                    return element.EnumerateArray().Select(obj => obj.GetString()).ToArray();
                }
                if (preferType == typeof(decimal))
                {
                    return element.EnumerateArray().Select(obj => obj.GetDecimal()).ToArray();
                }
            }

            throw new Exception($"Cannot handle JSON element of type {element.ValueKind}");
        }

        private enum ColumnType
        {
            String,
            Int
        }
    }
}
