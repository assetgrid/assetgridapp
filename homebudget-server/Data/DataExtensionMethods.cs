using homebudget_server.Models;
using homebudget_server.Models.ViewModels;
using System.Linq.Expressions;

namespace homebudget_server.Data
{
    public static class DataExtensionMethods
    {
        public static IQueryable<Account> ApplySearch(this IQueryable<Account> account, ViewSearch query)
        {
            if (query.Query == null)
            {
                return account;
            }

            var columns = new[] { ("Id", ColumnType.Int), ("Name", ColumnType.String), ("Description", ColumnType.String) };
            var parameter = Expression.Parameter(typeof(Account), "account");
            var expression = SearchGroupToExpression(query.Query, columns, parameter);
            if (expression != null)
            {
                return account.Where(Expression.Lambda<Func<Account, bool>>(expression, parameter));
            }
            return account;
        }

        private static Expression? SearchGroupToExpression(ViewSearchGroup group, (string name, ColumnType type)[] columns, ParameterExpression parameter)
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

                    object? value;
                    switch(columns.First(column => column.name == group.Query.Column).type)
                    {
                        case ColumnType.String:
                            value = group.Query.Value;
                            break;
                        case ColumnType.Int:
                            if (int.TryParse(group.Query.Value, out int intValue))
                            {
                                value = intValue;
                            }
                            else
                            {
                                value = null;
                            }
                            break;
                        default:
                            throw new Exception("Unknown column type");
                    }

                    switch (group.Query.Operator)
                    {
                        case ViewSearchOperator.Equals:
                            if (value == null)
                            {
                                return Expression.Constant(false);
                            }
                            result = Expression.Equal(Expression.Property(parameter, group.Query.Column), Expression.Constant(value));
                            break;
                        case ViewSearchOperator.Contains:
                            if (string.IsNullOrEmpty(group.Query.Value))
                            {
                                return Expression.Constant(false);
                            }
                            result = Expression.Call(
                                // Call method Contains on the column with the value as the parameter
                                Expression.Property(parameter, group.Query.Column),
                                typeof(string).GetMethod("Contains", new[] { typeof(string) })!,
                                Expression.Constant(group.Query.Value)
                                );
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

        private enum ColumnType
        {
            String,
            Int
        }
    }
}
