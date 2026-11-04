#!/usr/bin/perl
# raw/itc -> itc.json. One entry per ITC quality (the level that carries colours); parentCollection is the
# broadloom collection from www.itc-carpets.com. Colours come from the public part of my.itc-carpets.com.
use strict; use warnings; use utf8;
use FindBin; use lib $FindBin::Bin; use Common;

my $R=root(); my $D="$R/raw/itc"; my $P='https://my.itc-carpets.com/en/products';

# Listing cards: id -> code, 520 px swatch, article number.
my %v;
for my $f (glob("$D/portal-list-*.html")) {
    my $h=slurp($f);
    while ($h =~ m{<a href="https://my\.itc-carpets\.com/en/products/([a-z0-9-]+)/(\d+)">\s*<div class="card-img-wrapper">\s*<img src="([^"]+)"[^>]*>.*?<h2 class="h4 mb-2 name">\s*(.*?)\s*</h2>(.*?)</a>}sg) {
        my ($s,$id,$img,$nm,$rest)=($1,$2,$3,clean($4),$5);
        my ($code)= $nm =~ / - (.+)$/;
        my ($art)= $rest =~ m{card-text small text-muted">\s*(.*?)\s*</p>}s;
        $v{$s}{$id}={code=>$code,image=>$img,article=>clean($art)};
    }
}
# Variant pages, for colours the (shuffled) listing never returned.
for my $f (glob("$D/portal-variant-*.html")) {
    my ($s,$id)= $f =~ m{portal-variant-(.+)-(\d+)\.html$} or next;
    my $h=slurp($f);
    my ($t)= $h =~ m{<h1 class="header-title mb-0">\s*(.*?)\s*</h1>}s or next;
    my ($code)= clean($t) =~ / - (.+)$/;
    my ($img)= $h =~ m{<img src="(https://my\.itc-carpets\.com/_media/images/image/\d+/fit/1100/1200/[^"]+)"};
    $v{$s}{$id}//={code=>$code,image=>$img};
}

my (@out,%done);
for my $f (sort glob("$D/*.html")) {
    (my $slug=$f) =~ s{.*/|\.html$}{}g;
    next if $slug =~ /^(_|portal-)/;
    my $h=slurp($f);
    next unless $h =~ m{<h1 class="hero__title">\s*(.*?)\s*</h1>}s;
    my $parent=clean($1);
    my ($intro)= $h =~ m{<meta name="description" content="([^"]*)"};
    my ($sheet)= $h =~ m{name="redirect" value="(https://www\.itc-carpets\.com/public/[^"]+\.pdf)"};
    my (%si,@pimg);
    while ($h =~ m{(?:src|srcset)="(https://www\.itc-carpets\.com/public/productsCollection/[^",\s]+\.jpe?g)}g) {
        my $u=$1; (my $k=$u) =~ s{.*/}{}; push @pimg,$u unless $si{$k}++;
    }
    while ($h =~ m{<a href="https://my\.itc-carpets\.com/en/products/([a-z0-9-]+)" class="product-tile" title="([^"]*)".*?<span class="product-tile__title">(.*?)</span>(.*?)</a>}sg) {
        my ($q,$title,$tname,$tail)=($1,$2,$3,$4);
        next if $done{$q}++;
        my @tile; while ($tail =~ m{class="tile-spec[^"]*">\s*(.*?)\s*</li>}sg) { push @tile,clean(strip($1)) }
        my @specs=map { /^\d+%|\d+% / ? {label=>'Pile composition',value=>$_} : /rug/ ? {label=>'Note',value=>$_} : /height/ ? {label=>'Pile height',value=>$_} : {label=>'Structure',value=>$_} } @tile;
        my $e={brand=>'ITC',collection=>clean($tname),parentCollection=>$parent,url=>"$P/$q",collectionPageUrl=>"https://www.itc-carpets.com/broadloom/$slug",
            description=>undef,specs=>\@specs,datasheetPdf=>$sheet,images=>[],colours=>[]};
        my $pf="$D/portal-$q.html";
        my %ids;
        my @ids;
        my @rooms;
        if (-s $pf) {
            my $p=slurp($pf);
            my ($d)= $p =~ m{<h1 class="header-title mb-0">.*?<div class="rte mb-2">(.*?)</div>}s;
            $e->{description}=strip($d);
            while ($p =~ m{<a href="https://my\.itc-carpets\.com/en/products/\Q$q\E/(\d+)">\s*<div\s+class="variant-option[^"]*"\s+style="background: url\('([^']+)'\)}sg) {
                push @ids,[$1,$2] unless $ids{$1}++;
            }
            while ($p =~ m{<img src="(https://my\.itc-carpets\.com/_media/images/image/\d+/fit/500/600/[^"]+)"}g) { push @rooms,$1 }
        } else { $e->{note}='quality page on my.itc-carpets.com answers 404' }
        for my $id (sort { $a <=> $b } keys %{$v{$q}||{}}) { push @ids,[$id,undef] unless $ids{$id}++ }
        for my $i (@ids) {
            my ($id,$th)=@$i; my $x=$v{$q}{$id}||{};
            push @{$e->{colours}},{code=>$x->{code},name=>undef,article=>$x->{article},image=>$x->{image}//$th,thumbnail=>$th,url=>"$P/$q/$id"};
        }
        my %s2; $e->{images}=[grep { !$s2{$_}++ } @rooms,@pimg];
        push @out,$e;
    }
}
# Stock qualities that exist on the portal but on no broadloom page.
for my $q (qw(rapid)) {
    next if $done{$q} || !-s "$D/portal-$q.html";
    my $p=slurp("$D/portal-$q.html");
    my ($t)= $p =~ m{<h1 class="header-title mb-0">\s*(.*?)\s*</h1>}s;
    my ($d)= $p =~ m{<h1 class="header-title mb-0">.*?<div class="rte mb-2">(.*?)</div>}s;
    my (@c,@r);
    for my $id (sort { $a <=> $b } keys %{$v{$q}||{}}) { my $x=$v{$q}{$id}; push @c,{code=>$x->{code},name=>undef,article=>$x->{article},image=>$x->{image},url=>"$P/$q/$id"} }
    while ($p =~ m{<img src="(https://my\.itc-carpets\.com/_media/images/image/\d+/fit/500/600/[^"]+)"}g) { push @r,$1 }
    push @out,{brand=>'ITC',collection=>clean($t),parentCollection=>undef,url=>"$P/$q",description=>strip($d),specs=>[],datasheetPdf=>undef,images=>\@r,colours=>\@c,
        note=>'on my.itc-carpets.com only, not listed on any /broadloom page'};
}
@out=sort { $a->{collection} cmp $b->{collection} } @out;
write_json("$R/itc.json",\@out);
my $n=0; $n+=@{$_->{colours}} for @out;
my $m=grep { !defined $_->{code} } map { @{$_->{colours}} } @out;
printf "itc: %d qualities, %d colours, %d without code\n",scalar(@out),$n,$m;
printf "no colours: %s\n",join(', ',map {$_->{collection}} grep {!@{$_->{colours}}} @out);
