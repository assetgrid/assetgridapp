using assetgrid_backend.Models;
using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models.ViewModels
{
    public class ViewCsvImportProfile
    {
        [MaxLength(50, ErrorMessage = "Name must be shorter than 50 characters")]
        public required string Name { get; set; }
        public required CsvImportProfile Profile { get; set; }
    }
}
