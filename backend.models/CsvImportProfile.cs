using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace assetgrid_backend.Models
{
    /*
     * If multiple versions are added, create classes for each version.
     * When deserializing it will deserialize into the correct class.
     * Each class should then have a method to upgrade to the next until we are at the latest version.
     */

    public class UserCsvImportProfile
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public required virtual User User { get; set; }
        public int Version { get; set; }

        [MaxLength(50)]
        public required string ProfileName { get; set; }
        public required CsvImportProfile ImportProfile { get; set; }

        public static CsvImportProfile ParseJson (string json)
        {
            var version = JsonSerializer.Deserialize<CsvImportProfileVersion?>(json);

            if (! version.HasValue)
            {
                throw new InvalidOperationException("Could not determine version of import profile");
            }

            switch (version.Value.Version)
            {
                case 2:
                    return JsonSerializer.Deserialize<CsvImportProfile>(json)!;
                default:
                    return JsonSerializer.Deserialize<CsvImportProfileV1>(json)!.Upgrade();
            }
        }

        private struct CsvImportProfileVersion
        {
            public int? Version { get; set; }
        }
    }

    public class CsvImportProfile : IValidatableObject
    {
        public int Version => 2;

        // CSV Options
        [MaxLength(50)]
        public required string CsvDelimiter { get; set; }
        
        [MaxLength(50)]
        public required string CsvNewlineCharacter { get; set; }
        [MaxLength(20)]
        public string? CsvTextEncoding { get; set; }
        public bool CsvParseHeader { get; set; }
        public uint CsvSkipLines { get; set; }

        // Mapping options
        [MaxLength(50)]
        public required string DuplicateHandling { get; set; }

        [MaxLength(50)]
        public string? IdentifierColumn { get; set; }
        public required ParseOptions IdentifierParseOptions { get; set; }

        [MaxLength(50)]
        public string? SourceAccountColumn { get; set; }

        public int? SourceAccountId { get; set; }

        [MaxLength(10)]
        public required string SourceAccountType { get; set; }
        public required ParseOptions SourceAccountParseOptions { get; set; }

        [MaxLength(50)]
        public string? DestinationAccountColumn { get; set; }

        public int? DestinationAccountId { get; set; }

        [MaxLength(10)]
        public required string DestinationAccountType { get; set; }
        public required ParseOptions DestinationAccountParseOptions { get; set; }

        [MaxLength(50)]
        public required string DebitAmountColumn { get; set; }
        public required ParseOptions DebitAmountParseOptions { get; set; }

        [MaxLength(50)]
        public string? CreditAmountColumn { get; set; }
        public required ParseOptions CreditAmountParseOptions { get; set; }
        public bool SeparateCreditDebitColumns { get; set; }

        [MaxLength(50)]
        public required string DecimalSeparator { get; set; }

        [MaxLength(50)]
        public required string DateColumn { get; set; }
        public required ParseOptions DateParseOptions { get; set; }

        [MaxLength(50)]
        public required string DateFormat { get; set; }

        [MaxLength(50)]
        public string? DescriptionColumn { get; set; }
        public required ParseOptions DescriptionParseOptions { get; set; }

        [MaxLength(50)]
        public string? CategoryColumn { get; set; }
        public required ParseOptions CategoryParseOptions { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            switch (DuplicateHandling)
            {
                case "automatic":
                case "none":
                    break;
                case "identifier":
                    if (string.IsNullOrWhiteSpace(IdentifierColumn))
                    {
                        yield return new ValidationResult($"Identifier column must be set with duplicate handling 'identifier'.", new[] { nameof(IdentifierColumn) });
                    }
                    break;
                default:
                    yield return new ValidationResult($"Unknown duplicate handling '{DuplicateHandling}'", new[] { nameof(DuplicateHandling) });
                    break;
            }
        }

        public class ParseOptions
        {
            public bool TrimWhitespace { get; set; }

            [MaxLength(250)]
            public required string? Regex { get; set; }

            [MaxLength(250)]
            public required string Pattern { get; set; }
        }
    }

    #region Previous versions

    public class CsvImportProfileV1 : IValidatableObject
    {
        // CSV Options
        [MaxLength(50)]
        public required string CsvDelimiter { get; set; }

        [MaxLength(50)]
        public required string CsvNewlineCharacter { get; set; }
        [MaxLength(20)]
        public string? CsvTextEncoding { get; set; }
        public bool CsvParseHeader { get; set; }

        // Mapping options
        [MaxLength(50)]
        public required string DuplicateHandling { get; set; }

        [MaxLength(50)]
        public string? IdentifierColumn { get; set; }
        public required ParseOptions IdentifierParseOptions { get; set; }

        [MaxLength(50)]
        public string? SourceAccountColumn { get; set; }

        public int? SourceAccountId { get; set; }

        [MaxLength(10)]
        public required string SourceAccountType { get; set; }
        public required ParseOptions SourceAccountParseOptions { get; set; }

        [MaxLength(50)]
        public string? DestinationAccountColumn { get; set; }

        public int? DestinationAccountId { get; set; }

        [MaxLength(10)]
        public required string DestinationAccountType { get; set; }
        public required ParseOptions DestinationAccountParseOptions { get; set; }

        [MaxLength(50)]
        public required string AmountColumn { get; set; }
        public required ParseOptions AmountParseOptions { get; set; }

        [MaxLength(50)]
        public required string DecimalSeparator { get; set; }

        [MaxLength(50)]
        public required string DateColumn { get; set; }
        public required ParseOptions DateParseOptions { get; set; }

        [MaxLength(50)]
        public required string DateFormat { get; set; }

        [MaxLength(50)]
        public string? DescriptionColumn { get; set; }
        public required ParseOptions DescriptionParseOptions { get; set; }

        [MaxLength(50)]
        public string? CategoryColumn { get; set; }
        public required ParseOptions CategoryParseOptions { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            switch (DuplicateHandling)
            {
                case "automatic":
                case "none":
                    break;
                case "identifier":
                    if (string.IsNullOrWhiteSpace(IdentifierColumn))
                    {
                        yield return new ValidationResult($"Identifier column must be set with duplicate handling 'identifier'.", new[] { nameof(IdentifierColumn) });
                    }
                    break;
                default:
                    yield return new ValidationResult($"Unknown duplicate handling '{DuplicateHandling}'", new[] { nameof(DuplicateHandling) });
                    break;
            }
        }

        public class ParseOptions
        {
            public bool TrimWhitespace { get; set; }

            [MaxLength(250)]
            public string? Regex { get; set; }

            [MaxLength(250)]
            public required string Pattern { get; set; }

            public CsvImportProfile.ParseOptions Upgrade ()
            {
                return new CsvImportProfile.ParseOptions
                {
                    Pattern = Pattern,
                    Regex = Regex,
                    TrimWhitespace = TrimWhitespace
                };
            }
        }

        public CsvImportProfile Upgrade()
        {
            return new CsvImportProfile
            {
                CategoryColumn = CategoryColumn,
                CategoryParseOptions = CategoryParseOptions.Upgrade(),
                CreditAmountColumn = "",
                CreditAmountParseOptions = AmountParseOptions.Upgrade(),
                DebitAmountColumn = AmountColumn,
                CsvDelimiter = CsvDelimiter,
                CsvNewlineCharacter = CsvNewlineCharacter,
                CsvParseHeader = CsvParseHeader,
                CsvSkipLines = 0,
                CsvTextEncoding = CsvTextEncoding,
                DateColumn = DateColumn,
                DateFormat = DateFormat,
                DateParseOptions = DateParseOptions.Upgrade(),
                DebitAmountParseOptions = AmountParseOptions.Upgrade(),
                DecimalSeparator = DecimalSeparator,
                DescriptionColumn = DescriptionColumn,
                DescriptionParseOptions = DescriptionParseOptions.Upgrade(),
                DestinationAccountColumn = DestinationAccountColumn,
                DestinationAccountId = DestinationAccountId,
                DestinationAccountParseOptions = DestinationAccountParseOptions.Upgrade(),
                DestinationAccountType = DestinationAccountType,
                DuplicateHandling = DuplicateHandling,
                IdentifierColumn = IdentifierColumn,
                IdentifierParseOptions = IdentifierParseOptions.Upgrade(),
                SeparateCreditDebitColumns = false,
                SourceAccountColumn = SourceAccountColumn,
                SourceAccountId = SourceAccountId,
                SourceAccountParseOptions = SourceAccountParseOptions.Upgrade(),
                SourceAccountType = SourceAccountType
            };
        }
    }

    #endregion
}
