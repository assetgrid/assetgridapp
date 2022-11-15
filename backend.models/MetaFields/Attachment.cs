using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace assetgrid_backend.models.MetaFields
{
    public class Attachment
    {
        [MaxLength(250)]
        public required string FileName { get; set; }
        public required long FileSize { get; set; }
        public Guid Id { get; set; }
    }
}
