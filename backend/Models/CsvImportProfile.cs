using System.ComponentModel.DataAnnotations;

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
        public virtual User User { get; set; } = null!;
        public int Version { get; set; }

        [MaxLength(50)]
        public string ProfileName { get; set; } = null!;
        public CsvImportProfile ImportProfile { get; set; } = null!;
    }

    public class CsvImportProfile : IValidatableObject
    {
        // CSV Options
        [MaxLength(50)]
        public string CsvDelimiter { get; set; } = null!;

        [MaxLength(50)]
        public string CsvNewlineCharacter { get; set; } = null!;
        [MaxLength(20)]
        public string? CsvTextEncoding { get; set; }
        public bool CsvParseHeader { get; set; }

        // Mapping options
        [MaxLength(50)]
        public string DuplicateHandling { get; set; } = null!;

        [MaxLength(50)]
        public string? IdentifierColumn { get; set; } = null!;
        public ParseOptions IdentifierParseOptions { get; set; } = null!;

        [MaxLength(50)]
        public string SourceAccountColumn { get; set; } = null!;

        public int? SourceAccountId { get; set; } = null!;

        [MaxLength(10)]
        public string SourceAccountType { get; set; } = null!;
        public ParseOptions SourceAccountParseOptions { get; set; } = null!;

        [MaxLength(50)]
        public string? DestinationAccountColumn { get; set; } = null!;

        public int? DestinationAccountId { get; set; } = null!;

        [MaxLength(10)]
        public string DestinationAccountType { get; set; } = null!;
        public ParseOptions DestinationAccountParseOptions { get; set; } = null!;

        [MaxLength(50)]
        public string AmountColumn { get; set; } = null!;
        public ParseOptions AmountParseOptions { get; set; } = null!;

        [MaxLength(50)]
        public string DecimalSeparator { get; set; } = null!;

        [MaxLength(50)]
        public string DateColumn { get; set; } = null!;
        public ParseOptions DateParseOptions { get; set; } = null!;

        [MaxLength(50)]
        public string DateFormat { get; set; } = null!;

        [MaxLength(50)]
        public string? DescriptionColumn { get; set; } = null!;
        public ParseOptions DescriptionParseOptions { get; set; } = null!;

        [MaxLength(50)]
        public string? CategoryColumn { get; set; } = null!;
        public ParseOptions CategoryParseOptions { get; set; } = null!;

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
            public string? Regex { get; set; } = null!;

            [MaxLength(250)]
            public string Pattern { get; set; } = null!;
        }
    }
}
