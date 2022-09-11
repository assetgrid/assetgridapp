﻿using homebudget_server.Models;
using homebudget_server.Models.ViewModels;
using System.Linq.Expressions;
using System.Text.Json;

namespace homebudget_server.Data
{
    public static class DataExtensionMethods
    {
        public static IQueryable<Account> ApplySearch(this IQueryable<Account> items, ViewSearch query)
        {
            if (query.Query == null)
            {
                return items;
            }

            var columns = new[] {
                ("Id", typeof(int), false),
                ("Name", typeof(string), false),
                ("Description", typeof(string), false),
                ("AccountNumber", typeof(string), false)
            };
            var parameter = Expression.Parameter(typeof(Account), "account");
            var expression = SearchGroupToExpression(query.Query, columns, parameter);
            if (expression != null)
            {
                return items.Where(Expression.Lambda<Func<Account, bool>>(expression, parameter));
            }
            return items;
        }

        public static IQueryable<Transaction> ApplySearch(this IQueryable<Transaction> items, ViewSearchGroup? query)
        {
            if (query == null)
            {
                return items;
            }

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
            var expression = SearchGroupToExpression(query, columns, parameter);
            if (expression != null)
            {
                items = items.Where(Expression.Lambda<Func<Transaction, bool>>(expression, parameter));
            }
            return items;
        }

        private static Expression? SearchGroupToExpression(ViewSearchGroup group, (string name, Type type, bool allowNull)[] columns, ParameterExpression parameter)
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
                            var left = Expression.Property(parameter, group.Query.Column);
                            result = Expression.Equal(left, Expression.Constant(columnValue, left.Type));
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
                                    Expression.Property(parameter, group.Query.Column),
                                    typeof(string).GetMethod("Contains", new[] { typeof(string) })!,
                                    Expression.Constant(columnValue)
                                    );
                                break;
                            }
                            else if (columnValue.GetType().GetElementType() == column.type)
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
                                    Expression.Property(parameter, group.Query.Column)
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
                            result = Expression.GreaterThan(Expression.Property(parameter, group.Query.Column), Expression.Constant(columnValue));
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
                            result = Expression.GreaterThanOrEqual(Expression.Property(parameter, group.Query.Column), Expression.Constant(columnValue));
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
