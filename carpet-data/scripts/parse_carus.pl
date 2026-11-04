#!/usr/bin/perl
# raw/carus/<slug>.html -> carus.json. The site has no spec table in HTML: specs live in the datasheet PDF.
use strict; use warnings; use utf8;
use FindBin; use lib $FindBin::Bin; use Common;

my $R = root(); my $B='https://www.carusflooring.com';
my %path=('golden-gate'=>'1/golden-gate','grande'=>'2/grande','original-natural'=>'4/original-natural-','chevron-natural'=>'6/chevron-natural-','nova'=>'9/nova','brut'=>'10/brut');
my @out;
for my $slug (sort keys %path) {
    my $h = slurp("$R/raw/carus/$slug.html");
    my ($name) = $h =~ m{<h1 class="mb-6">(.*?)</h1>}s;
    my ($desc) = $h =~ m{<h1 class="mb-6">.*?</h1>\s*<div class="font-light mb-6">(.*?)</div>\s*</div>\s*</div>}s;
    my ($pdf)  = $h =~ m{href="(/images/common/collections/\d+/downloads/pdfDatasheet\.pdf)"};
    my ($bro)  = $h =~ m{href="(/images/common/collections/\d+/downloads/pdfBrochure\.pdf)"};
    my @images; my %s;
    my ($hero) = $h =~ m{<img src="(/images/common/collections/\d+/[^"]+)"};
    push @images, abs_url($B,$hero) if $hero;
    my @colours;
    my @prods = split /(?=<div class="space-y-4 my-10" data-product=)/, $h; shift @prods;
    for my $b (@prods) {
        my ($pid,$pname) = $b =~ m{data-product="(\d+)"\s+data-product-name="([^"]*)"};
        $pname = clean($pname);
        my ($src) = $b =~ m{data-lightbox="[^"]*"\s+data-downloadable\s+href="(/images/common/produits/\d+/[^"]+)"};
        my ($th)  = $b =~ m{<img src="(/images/common/produits/\d+/[^"]+)"};
        my $large = abs_url($B, $src // $th);
        push @images, $large if $large && !$s{$large}++;
        while ($b =~ m{data-lightbox="[^"]*"\s+data-title="([^"]*)"\s+data-downloadable\s+href="(/images/common/produits/echantillon/[^"]+)"}g) {
            push @colours, {code=>clean($1), name=>$pname, design=>$pname, image=>abs_url($B,$2), roomImage=>$large,
                url=>"$B/collections/$path{$slug}.html"};
        }
    }
    push @out, {brand=>'Carus', collection=>clean($name), url=>"$B/collections/$path{$slug}.html", description=>strip($desc),
        specs=>[], datasheetPdf=>abs_url($B,$pdf), brochurePdf=>abs_url($B,$bro), images=>\@images, colours=>\@colours};
}
write_json("$R/carus.json", \@out);
printf "%-22s %d colours, pdf=%s\n", $_->{collection}, scalar(@{$_->{colours}}), ($_->{datasheetPdf}//'-') for @out;
